from django.db import models
from pgvector.django import VectorField


class SeedImage(models.Model):
    image = models.ImageField(upload_to="uploads/")
    detections = models.JSONField()
    processing_time_ms = models.IntegerField(null=True, blank=True)
    image_width = models.IntegerField(null=True, blank=True)
    image_height = models.IntegerField(null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    # Multi-seed detection fields
    original_image_path = models.CharField(max_length=500, null=True, blank=True)  # Reference to original upload
    bbox = models.JSONField(null=True, blank=True)  # [x1, y1, x2, y2] for this specific seed

    # Prediction fields
    prediction = models.CharField(max_length=100, null=True, blank=True)  # class_name
    confidence = models.FloatField(null=True, blank=True)
    quality = models.CharField(max_length=20, null=True, blank=True)
    embedding = VectorField(dimensions=512, null=True, blank=True)

    # Blockchain fields
    blockchain_tx_id = models.CharField(max_length=255, null=True, blank=True)
    blockchain_type = models.CharField(
        max_length=20,
        choices=[('fabric', 'Fabric'), ('sawtooth', 'Sawtooth'), ('unknown', 'Unknown')],
        default='unknown',
        null=True,
        blank=True
    )
    signer_name = models.CharField(max_length=100, default='Unknown', null=True, blank=True)

    def __str__(self):
        return f"Seed {self.pk} - {self.prediction} ({self.confidence})"

    class Meta:
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['prediction']),
            models.Index(fields=['uploaded_at']),
            models.Index(fields=['blockchain_tx_id']),
            models.Index(fields=['blockchain_type']),
        ]