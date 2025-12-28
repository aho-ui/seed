from django.test import TestCase
from .models import ImageAnalysis
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
import io


class ImageAnalysisModelTest(TestCase):
    """Test ImageAnalysis model with PostgreSQL and pgvector"""

    def setUp(self):
        """Create dummy data for tests"""
        self.dummy_embedding = [0.1 + (i * 0.01) for i in range(512)]

        self.dummy_detections = [{
            "bbox": [0, 0, 224, 224],
            "class": "intact_soybeans",
            "confidence": 0.95,
            "quality": "High",
            "quality_class": "intact_soybeans",
            "quality_confidence": 0.95,
            "embedding": self.dummy_embedding
        }]

    def _create_dummy_image(self):
        """Helper to create a dummy image file"""
        img = Image.new('RGB', (224, 224), color='red')
        img_io = io.BytesIO()
        img.save(img_io, format='JPEG')
        img_io.seek(0)
        return SimpleUploadedFile("test.jpg", img_io.read(), content_type="image/jpeg")

    def test_create_analysis_basic(self):
        """Test creating a basic analysis record"""
        analysis = ImageAnalysis.objects.create(
            image=self._create_dummy_image(),
            detections=self.dummy_detections,
            class_name="intact_soybeans",
            confidence=0.95,
            quality="High",
            processing_time_ms=100,
            image_width=224,
            image_height=224
        )

        self.assertEqual(analysis.class_name, "intact_soybeans")
        self.assertEqual(analysis.confidence, 0.95)
        self.assertEqual(analysis.quality, "High")
        self.assertEqual(analysis.processing_time_ms, 100)
        print(f"✓ Created analysis record: {analysis}")

    def test_create_analysis_with_embedding(self):
        """Test creating analysis with 512-dimensional embedding"""
        analysis = ImageAnalysis.objects.create(
            image=self._create_dummy_image(),
            detections=self.dummy_detections,
            class_name="broken_soybeans",
            confidence=0.88,
            quality="Medium",
            embedding=self.dummy_embedding,
            processing_time_ms=150
        )

        self.assertIsNotNone(analysis.embedding)
        self.assertEqual(len(analysis.embedding), 512)
        self.assertAlmostEqual(analysis.embedding[0], 0.1, places=2)
        print(f"✓ Saved 512-dim embedding to pgvector")

    def test_query_by_class_name(self):
        """Test querying records by class name"""
        ImageAnalysis.objects.create(
            image=self._create_dummy_image(),
            detections=self.dummy_detections,
            class_name="intact_soybeans",
            confidence=0.95,
            embedding=self.dummy_embedding
        )

        ImageAnalysis.objects.create(
            image=self._create_dummy_image(),
            detections=self.dummy_detections,
            class_name="broken_soybeans",
            confidence=0.82,
            embedding=self.dummy_embedding
        )

        intact = ImageAnalysis.objects.filter(class_name="intact_soybeans")
        self.assertEqual(intact.count(), 1)
        self.assertEqual(intact.first().confidence, 0.95)
        print(f"✓ Queried by class_name: found {intact.count()} records")

    def test_ordering(self):
        """Test that records are ordered by uploaded_at desc"""
        first = ImageAnalysis.objects.create(
            image=self._create_dummy_image(),
            detections=self.dummy_detections,
            class_name="intact_soybeans",
            confidence=0.90
        )

        second = ImageAnalysis.objects.create(
            image=self._create_dummy_image(),
            detections=self.dummy_detections,
            class_name="broken_soybeans",
            confidence=0.85
        )

        all_records = ImageAnalysis.objects.all()
        self.assertEqual(all_records[0].id, second.id)
        self.assertEqual(all_records[1].id, first.id)
        print(f"✓ Records ordered correctly (newest first)")

    def test_detections_json_field(self):
        """Test JSON field stores and retrieves correctly"""
        analysis = ImageAnalysis.objects.create(
            image=self._create_dummy_image(),
            detections=self.dummy_detections,
            class_name="spotted_soybeans",
            confidence=0.75
        )

        retrieved = ImageAnalysis.objects.get(pk=analysis.pk)
        self.assertEqual(len(retrieved.detections), 1)
        self.assertEqual(retrieved.detections[0]["class"], "intact_soybeans")
        self.assertEqual(retrieved.detections[0]["confidence"], 0.95)
        print(f"✓ JSON detections stored and retrieved correctly")

    def test_nullable_fields(self):
        """Test that nullable fields work correctly"""
        analysis = ImageAnalysis.objects.create(
            image=self._create_dummy_image(),
            detections=[]
        )

        self.assertIsNone(analysis.class_name)
        self.assertIsNone(analysis.confidence)
        self.assertIsNone(analysis.quality)
        self.assertIsNone(analysis.embedding)
        print(f"✓ Nullable fields handled correctly")

    def test_str_representation(self):
        """Test model string representation"""
        analysis = ImageAnalysis.objects.create(
            image=self._create_dummy_image(),
            detections=self.dummy_detections,
            class_name="immature_soybeans",
            confidence=0.92
        )

        expected = f"Image {analysis.pk} - immature_soybeans (0.92)"
        self.assertEqual(str(analysis), expected)
        print(f"✓ String representation: {str(analysis)}")


class DatabaseConnectionTest(TestCase):
    """Test PostgreSQL connection and pgvector extension"""

    def test_postgres_connection(self):
        """Test that we're connected to PostgreSQL"""
        from django.db import connection

        with connection.cursor() as cursor:
            cursor.execute("SELECT version();")
            version = cursor.fetchone()[0]
            self.assertIn("PostgreSQL", version)
            print(f"✓ Connected to PostgreSQL: {version[:50]}...")

    def test_pgvector_extension(self):
        """Test that pgvector extension is installed"""
        from django.db import connection

        with connection.cursor() as cursor:
            cursor.execute("SELECT extname FROM pg_extension WHERE extname = 'vector';")
            result = cursor.fetchone()
            self.assertIsNotNone(result)
            self.assertEqual(result[0], "vector")
            print(f"✓ pgvector extension is installed")
