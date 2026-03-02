"""
Create users table and seed admin account.
Usage: poetry run python -m app.db.create_users
"""
import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal
from app.db.models import Base, User
from loguru import logger


async def create_users_table():
    """Create the users table if not exists."""
    from app.db.session import engine
    
    async with engine.begin() as conn:
        # Create only the users table
        await conn.run_sync(Base.metadata.create_all, tables=[User.__table__])
    
    logger.info("✅ Users table created (if not existed)")


async def seed_admin(email: str, username: str, password: str):
    """Seed the first admin account."""
    import bcrypt
    
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    async with AsyncSessionLocal() as session:
        # Check if admin already exists
        result = await session.execute(
            text("SELECT id FROM users WHERE email = :email"),
            {"email": email}
        )
        if result.scalar_one_or_none():
            logger.info(f"Admin '{email}' already exists, skipping seed.")
            return
        
        admin = User(
            email=email,
            username=username,
            hashed_password=hashed,
            role="admin",
            is_active=True
        )
        session.add(admin)
        await session.commit()
        logger.info(f"✅ Admin account created: {email}")


async def main():
    import sys
    
    await create_users_table()
    
    # Seed admin — customize these!
    admin_email = "admin@truyen.local"
    admin_username = "Admin"
    admin_password = "admin123"  # Change this!
    
    if len(sys.argv) >= 4:
        admin_email = sys.argv[1]
        admin_username = sys.argv[2]
        admin_password = sys.argv[3]
    
    await seed_admin(admin_email, admin_username, admin_password)
    print(f"\nDone! Admin login: {admin_email} / {admin_password}")


if __name__ == "__main__":
    asyncio.run(main())
