import os

class Settings:
    PROJECT_NAME: str = "Synthetic Data Studio API"
    API_V1_STR: str = "/api"
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    # Security
    SECRET_KEY: str = os.getenv("JWT_SECRET", "super-secret-key-for-synthetic-data-studio-123456")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week

    # Supabase Integration (Optional, falls back to local SQLite/JWT if not configured)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "")

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./synthetic_data.db")

    # AI Service
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # Storage Path
    STORAGE_DIR: str = os.getenv("STORAGE_DIR", "./exports")

    # Razorpay Payment Gateway
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "rzp_live_SxQQLGSk3IYlXu")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "Hd8HAh2Z4ndgSwBUTiozbNz2")

    # Subscription Plan Limits
    FREE_LIMIT: int = 5_000          # rows/month
    STARTER_LIMIT: int = 100_000     # rows/month
    PRO_LIMIT: int = 1_000_000       # rows/month
    ENTERPRISE_LIMIT: int = 99_999_999  # effectively unlimited

    # API call limits per plan
    FREE_API_LIMIT: int = 100
    STARTER_API_LIMIT: int = 1_000
    PRO_API_LIMIT: int = 10_000
    ENTERPRISE_API_LIMIT: int = 999_999

    # Pricing in INR paise (Razorpay uses paise: 1 INR = 100 paise)
    PLAN_PRICES = {
        "starter":    49900,   # ₹499/month
        "pro":       149900,   # ₹1,499/month
        "enterprise": 499900,  # ₹4,999/month
    }

    def get_db_url(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+pg8000://", 1)
        elif url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+pg8000://", 1)
        return url

settings = Settings()
