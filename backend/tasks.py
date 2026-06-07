import os
import uuid
import json
from celery_app import celery_app
from backend.database import SessionLocal
from backend.models import Dataset, User, AuditLog
from backend.generator import RelationalDatasetGenerator, export_data, analyze_dataset_quality
from backend.config import settings

@celery_app.task(name="backend.tasks.generate_dataset_background")
def generate_dataset_background(payload: dict, dataset_id: str, user_id: str):
    """
    Asynchronous Celery task to generate mock datasets in the background.
    """
    db = SessionLocal()
    try:
        # Fetch target dataset object
        dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        user = db.query(User).filter(User.id == user_id).first()
        if not dataset or not user:
            return "Dataset or User not found"

        locale = payload.get("locale", "en_US")
        noise_level = payload.get("noise_level", "perfect")
        global_null_pct = payload.get("global_null_pct", 0.0)
        export_format = payload.get("export_format", "CSV")

        # Instantiate generator
        generator = RelationalDatasetGenerator(locale=locale)
        tables_config = {
            "tables": payload.get("tables", [])
        }
        
        # 1. Run generation
        dataset_data = generator.generate_relational_dataset(
            tables_config=tables_config,
            noise_level=noise_level,
            global_null_pct=global_null_pct
        )

        # 2. Run quality scoring engine
        quality_report = analyze_dataset_quality(dataset_data, payload.get("tables", []))

        # 3. Export to file
        primary_table_name = payload.get("tables")[0]["name"]
        primary_data = dataset_data.get(primary_table_name, [])
        
        export_bytes = b""
        if len(payload.get("tables")) > 1 and export_format.upper() == "XLSX":
            import io
            import pandas as pd
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine="openpyxl") as writer:
                for t_name, t_data in dataset_data.items():
                    pd.DataFrame(t_data).to_excel(writer, index=False, sheet_name=t_name)
            output.seek(0)
            export_bytes = output.getvalue()
        elif len(payload.get("tables")) > 1 and export_format.upper() == "SQL":
            lines = []
            for t_name, t_data in dataset_data.items():
                lines.append(export_data(t_data, "SQL", t_name).decode("utf-8"))
            export_bytes = "\n\n".join(lines).encode("utf-8")
        elif len(payload.get("tables")) > 1 and export_format.upper() == "JSON":
            export_bytes = json.dumps(dataset_data, indent=2).encode("utf-8")
        else:
            export_bytes = export_data(primary_data, export_format, primary_table_name)

        # 4. Save file to disk
        ext = export_format.lower()
        if ext == "excel":
            ext = "xlsx"
        filename = f"{dataset_id}.{ext}"
        filepath = os.path.join(settings.STORAGE_DIR, filename)
        
        with open(filepath, "wb") as f:
            f.write(export_bytes)

        # 5. Update database record
        dataset.quality_score = quality_report["overall"]
        dataset.quality_report = quality_report
        # If there are multiple tables, we save the first table preview in download metadata
        dataset.download_url = f"/api/datasets/{dataset_id}/download"
        
        # Write audit logs
        log = AuditLog(
            user_id=user.id,
            action="BACKGROUND_GENERATION_SUCCESS",
            details=f"Completed async dataset generation for '{dataset.name}' ({dataset.row_count} rows, Score: {dataset.quality_score})."
        )
        
        db.add(log)
        db.commit()
        return f"Generation complete for dataset {dataset_id}"
        
    except Exception as e:
        db.rollback()
        # Log error in audit log
        try:
            log = AuditLog(
                user_id=user_id,
                action="BACKGROUND_GENERATION_FAILED",
                details=f"Failed async generation: {str(e)}"
            )
            db.add(log)
            db.commit()
        except Exception:
            pass
        return f"Generation failed: {str(e)}"
    finally:
        db.close()
