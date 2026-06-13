import pytest
import zipfile
import io
import csv
from backend.image_generator import SyntheticImageGenerator, create_image_dataset_zip

def test_image_generator_single_images():
    generator = SyntheticImageGenerator()
    
    # Test MRI healthy vs tumor
    mri_healthy = generator.generate_image("mri", "healthy", size=64, noise_level="none")
    assert mri_healthy.size == (64, 64)
    assert mri_healthy.mode == "RGB"

    mri_tumor = generator.generate_image("mri", "tumor", size=128, noise_level="high")
    assert mri_tumor.size == (128, 128)
    assert mri_tumor.mode == "RGB"

    # Test defect detection normal vs defect
    defect_normal = generator.generate_image("defects", "normal", size=64, noise_level="low")
    assert defect_normal.size == (64, 64)

    # Test OCR digits
    ocr_digit = generator.generate_image("ocr", "5", size=64, noise_level="low")
    assert ocr_digit.size == (64, 64)

    # Test satellite land cover
    satellite_forest = generator.generate_image("satellite", "forest", size=64, noise_level="none")
    assert satellite_forest.size == (64, 64)

    # Test new categories
    captcha_img = generator.generate_image("captcha", "5_characters", size=64, noise_level="none")
    assert captcha_img.size == (64, 64)

    plates_img = generator.generate_image("plates", "yellow_plate", size=64, noise_level="low")
    assert plates_img.size == (64, 64)

    digital_img = generator.generate_image("digital", "8", size=64, noise_level="high")
    assert digital_img.size == (64, 64)

    aruco_img = generator.generate_image("aruco", "marker_id_1", size=64, noise_level="none")
    assert aruco_img.size == (64, 64)

    ecg_img = generator.generate_image("ecg", "arrhythmia", size=64, noise_level="low")
    assert ecg_img.size == (64, 64)

    chess_img = generator.generate_image("chess", "checkmate", size=64, noise_level="none")
    assert chess_img.size == (64, 64)

def test_create_image_dataset_zip():
    # Test standard shapes dataset
    num_images_per_class = 5
    size = 64
    noise_level = "low"
    split_ratio = 0.8
    
    zip_buffer = create_image_dataset_zip(
        dataset_type="shapes",
        num_images_per_class=num_images_per_class,
        size=size,
        noise_level=noise_level,
        split_ratio=split_ratio
    )
    
    assert isinstance(zip_buffer, io.BytesIO)
    
    with zipfile.ZipFile(zip_buffer, "r") as z:
        file_list = z.namelist()
        
        # Verify metadata.csv is in the root
        assert "metadata.csv" in file_list
        
        # Read metadata.csv
        metadata_content = z.read("metadata.csv").decode("utf-8")
        reader = csv.reader(io.StringIO(metadata_content))
        rows = list(reader)
        
        # Header + 15 rows (3 classes * 5 images)
        assert len(rows) == 16
        assert rows[0] == ["filename", "label"]
        
        # Verify classes are present in file list and metadata
        classes_found = set()
        train_count = 0
        val_count = 0
        
        for filename, label in rows[1:]:
            classes_found.add(label)
            assert filename in file_list
            assert label in ["circle", "square", "triangle"]
            
            if filename.startswith("train/"):
                train_count += 1
            elif filename.startswith("val/"):
                val_count += 1
            else:
                pytest.fail(f"Invalid split folder in filename: {filename}")
                
        assert classes_found == {"circle", "square", "triangle"}
        # 3 classes * 4 train = 12
        assert train_count == 12
        # 3 classes * 1 val = 3
        assert val_count == 3

def test_create_captcha_dataset_zip():
    # Test captcha transcription logic
    num_images_per_class = 2
    size = 64
    noise_level = "none"
    split_ratio = 0.5
    
    zip_buffer = create_image_dataset_zip(
        dataset_type="captcha",
        num_images_per_class=num_images_per_class,
        size=size,
        noise_level=noise_level,
        split_ratio=split_ratio
    )
    
    assert isinstance(zip_buffer, io.BytesIO)
    
    with zipfile.ZipFile(zip_buffer, "r") as z:
        file_list = z.namelist()
        assert "metadata.csv" in file_list
        
        metadata_content = z.read("metadata.csv").decode("utf-8")
        reader = csv.reader(io.StringIO(metadata_content))
        rows = list(reader)
        
        # Header + 6 rows (3 classes * 2 images)
        assert len(rows) == 7
        # Verify 3 columns: filename, label, transcription
        assert rows[0] == ["filename", "label", "transcription"]
        
        for filename, label, transcription in rows[1:]:
            assert filename in file_list
            assert label in ["4_characters", "5_characters", "6_characters"]
            # Verify transcription has characters
            assert len(transcription) in [4, 5, 6]
