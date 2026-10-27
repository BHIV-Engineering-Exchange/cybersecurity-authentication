import os
import sys
import shutil
from sqlalchemy import text

# Add the project root and backend directory to path
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(script_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Ensure WE are in the backend directory so sqlite relative paths work
os.chdir(backend_dir)

from app.db.database import SessionLocal, engine
from app.db import models
from app.core.config import settings

def purge_data():
    db = SessionLocal()
    try:
        # 1. Clear SQL Tables
        print("Purging SQL database tables...")
        
        # Tables to clear completely
        tables_to_clear = [
            models.IncidentReport,
            models.Complaint,
            models.AuditLog,
            models.Message,
            models.Wallet,
            models.Transaction,
            models.Case,
            models.Evidence,
            models.RiskScore,
            models.FraudTransaction,
            models.WatchlistWallet,
            models.InvestigatorAccessRequest
        ]
        
        for model in tables_to_clear:
            try:
                print(f"  Clearing {model.__tablename__}...")
                db.query(model).delete()
            except Exception as e:
                print(f"    Warning: Could not clear {model.__tablename__}: {e}")
            
        # Clear users except superadmin
        print("  Clearing users (except superadmins)...")
        db.query(models.User).filter(models.User.role != "superadmin").delete()
        
        db.commit()
        print("SQL Purge complete.")

        # 2. Clear File Storage
        print("\nClearing file storage...")
        # Check current working directory to adjust paths
        current_dir = os.getcwd()
        is_in_backend = current_dir.endswith('backend')
        
        storage_paths = [
            settings.EVIDENCE_STORAGE_PATH,
            settings.UPLOAD_DIR,
            settings.TTS_OUTPUT_DIR
        ]
        
        for path in storage_paths:
            # Ensure path is absolute for safety
            if not os.path.isabs(path):
                path = os.path.abspath(path)
                
            if os.path.exists(path):
                print(f"  Clearing {path}...")
                for filename in os.listdir(path):
                    file_path = os.path.join(path, filename)
                    # Don't delete .gitignore or other hidden files in these folders if they exist
                    if filename.startswith('.'):
                        continue
                    try:
                        if os.path.isfile(file_path) or os.path.islink(file_path):
                            os.unlink(file_path)
                            print(f"    Deleted file: {filename}")
                        elif os.path.isdir(file_path):
                            shutil.rmtree(file_path)
                            print(f"    Deleted directory: {filename}")
                    except Exception as e:
                        print(f"    Failed to delete {file_path}. Reason: {e}")
            else:
                print(f"  Path {path} does not exist, skipping.")

        # 3. Clear MongoDB (if connected)
        try:
            import asyncio
            from app.db.mongodb import mongodb, connect_to_mongo
            
            async def purge_mongo():
                print("\nAttempting to purge MongoDB...")
                try:
                    await connect_to_mongo()
                    if mongodb.database is not None:
                        # Clear incident reports collection
                        count = await mongodb.database.incident_reports.count_documents({})
                        if count > 0:
                            await mongodb.database.incident_reports.delete_many({})
                            print(f"  Cleared {count} documents from MongoDB incident_reports.")
                        else:
                            print("  MongoDB incident_reports is already empty.")
                    else:
                        print("  MongoDB not connected, skipping.")
                except Exception as e:
                    print(f"  MongoDB connection/purge error: {e}")
            
            # Run async purge
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(purge_mongo())
        except Exception as e:
            print(f"  MongoDB purge logic failed to start: {e}")

        print("\nAll dummy data purged successfully!")
        remaining_users = db.query(models.User).all()
        print(f"Remaining Users: {[(u.email, u.role) for u in remaining_users]}")

    except Exception as e:
        db.rollback()
        print(f"Error during purge: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    purge_data()
