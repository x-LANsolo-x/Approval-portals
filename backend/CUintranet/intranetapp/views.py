from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

@api_view(['PUT'])
def password_reset(request, email):
    return Response({'message': 'Endpoint disabled (legacy)'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
def UserLogin(request):
    return Response({'message': 'Endpoint disabled (legacy)'}, status=status.HTTP_404_NOT_FOUND)
