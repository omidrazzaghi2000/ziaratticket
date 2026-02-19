from django.db import models

class Caravan(models.Model):
    name = models.CharField(max_length=200)
    departure_date = models.CharField(max_length=30)
    duration = models.IntegerField()
    transportation_type = models.CharField(max_length=20)
    price = models.IntegerField()
    capacity = models.IntegerField()
    remaining_capacity = models.IntegerField()
    accommodation_type = models.CharField(max_length=200)
    accommodation_distance = models.IntegerField()
    manager = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    popular = models.BooleanField(default=False)
    special_tag = models.CharField(max_length=100, blank=True, null=True)
    image_url = models.CharField(max_length=300, blank=True, null=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
