import datetime
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app import models, schemas, security, database
from app.email_service import generate_otp, send_otp_email

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── Helper ────────────────────────────────────────────────────────────────────

def _create_and_send_otp(db: Session, email: str, purpose: str, bg: BackgroundTasks):
    # Invalidate any existing unused OTPs for this email + purpose
    db.query(models.OTPCode).filter(
        models.OTPCode.email == email,
        models.OTPCode.purpose == purpose,
        models.OTPCode.used == False,
    ).delete()
    db.commit()

    otp = generate_otp()
    expires = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
    record = models.OTPCode(email=email, code=otp, purpose=purpose, expires_at=expires)
    db.add(record)
    db.commit()
    bg.add_task(send_otp_email, email, otp, purpose)


# ── Register ──────────────────────────────────────────────────────────────────

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    user_in: schemas.UserCreate,
    bg: BackgroundTasks,
    db: Session = Depends(database.get_db),
):
    # Password strength
    err = security.validate_password_strength(user_in.password)
    if err:
        raise HTTPException(status_code=400, detail=err)

    # Unique username
    if db.query(models.User).filter(models.User.username == user_in.username).first():
        raise HTTPException(status_code=400, detail="Username is already taken.")

    # Unique email
    if db.query(models.User).filter(models.User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email is already registered.")

    new_user = models.User(
        username=user_in.username,
        email=user_in.email,
        display_name=user_in.display_name or user_in.username,
        hashed_password=security.get_password_hash(user_in.password),
        is_email_verified=False,
    )
    db.add(new_user)
    db.commit()

    _create_and_send_otp(db, user_in.email, "register", bg)
    return {"message": "Account created! Check your email for the verification OTP.", "email": user_in.email}


# ── Email Verification ────────────────────────────────────────────────────────

@router.post("/verify-email")
def verify_email(payload: schemas.OTPVerify, db: Session = Depends(database.get_db)):
    record = db.query(models.OTPCode).filter(
        models.OTPCode.email == payload.email,
        models.OTPCode.purpose == "register",
        models.OTPCode.used == False,
    ).first()

    if not record:
        raise HTTPException(status_code=400, detail="No pending verification. Request a new OTP.")
    if datetime.datetime.utcnow() > record.expires_at:
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")
    if record.code != payload.code:
        raise HTTPException(status_code=400, detail="Invalid OTP. Please try again.")

    record.used = True
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if user:
        user.is_email_verified = True
    db.commit()
    return {"message": "Email verified! You can now log in."}


@router.post("/resend-otp")
def resend_otp(
    payload: schemas.OTPRequest,
    bg: BackgroundTasks,
    db: Session = Depends(database.get_db),
):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with that email.")
    if user.is_email_verified:
        raise HTTPException(status_code=400, detail="Email is already verified.")
    _create_and_send_otp(db, payload.email, "register", bg)
    return {"message": "OTP resent. Check your email."}


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=schemas.Token)
def login(login_data: schemas.LoginRequest, db: Session = Depends(database.get_db)):
    identifier = login_data.identifier.strip()

    # Support login by email or username
    if "@" in identifier:
        user = db.query(models.User).filter(models.User.email == identifier).first()
    else:
        user = db.query(models.User).filter(models.User.username == identifier).first()

    if not user or not security.verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect credentials. Please try again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please check your inbox for the OTP.",
        )

    token = security.create_access_token(data={"sub": user.username})
    return {"access_token": token, "token_type": "bearer"}


# ── Forgot / Reset Password ───────────────────────────────────────────────────

@router.post("/forgot-password")
def forgot_password(
    payload: schemas.OTPRequest,
    bg: BackgroundTasks,
    db: Session = Depends(database.get_db),
):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if user:  # Send OTP silently; never reveal whether email exists
        _create_and_send_otp(db, payload.email, "reset", bg)
    return {"message": "If an account with that email exists, an OTP has been sent."}


@router.post("/reset-password")
def reset_password(payload: schemas.PasswordReset, db: Session = Depends(database.get_db)):
    record = db.query(models.OTPCode).filter(
        models.OTPCode.email == payload.email,
        models.OTPCode.purpose == "reset",
        models.OTPCode.used == False,
    ).first()

    if not record:
        raise HTTPException(status_code=400, detail="No reset request found. Please try again.")
    if datetime.datetime.utcnow() > record.expires_at:
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")
    if record.code != payload.code:
        raise HTTPException(status_code=400, detail="Invalid OTP.")

    err = security.validate_password_strength(payload.new_password)
    if err:
        raise HTTPException(status_code=400, detail=err)

    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.hashed_password = security.get_password_hash(payload.new_password)
    record.used = True
    db.commit()
    return {"message": "Password reset successfully! You can now log in."}
