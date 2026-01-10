from rest_framework import serializers
from .models import Note

class NoteSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source="user.username")

    class Meta:
        model = Note
        fields = ["id", "user", "title", "content", "tags", "pinned", "created_at"]
