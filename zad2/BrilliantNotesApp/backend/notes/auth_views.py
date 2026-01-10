from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.authtoken.models import Token


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = (request.data.get("username") or "").strip()
        password = request.data.get("password") or ""

        if len(username) < 3:
            return Response({"error": "Username musi mieć min. 3 znaki"}, status=400)
        if len(password) < 6:
            return Response({"error": "Hasło musi mieć min. 6 znaków"}, status=400)
        if User.objects.filter(username=username).exists():
            return Response({"error": "Taki użytkownik już istnieje"}, status=400)

        user = User.objects.create_user(username=username, password=password)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "username": user.username}, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = (request.data.get("username") or "").strip()
        password = request.data.get("password") or ""

        user = authenticate(username=username, password=password)
        if not user:
            return Response({"error": "Nieprawidłowy login lub hasło"}, status=400)

        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "username": user.username})
