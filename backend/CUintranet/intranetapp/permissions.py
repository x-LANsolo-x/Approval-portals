from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied
 # Update with your app name
from .models import *
from django.utils import timezone
import pytz

def default_ist_time():
    # Get the current UTC time
    utc_time = timezone.now()

    # Convert UTC to IST (Asia/Kolkata timezone)
    ist_time = utc_time.astimezone(pytz.timezone('Asia/Kolkata'))
    return ist_time


# class IsAdminWithToken(BasePermission):
#     """
#     Allows access only to users with a valid token and the role 'Admin'.
#     Also ensures that the token has not expired.
#     """
#     def has_permission(self, request, view):
#         token = request.headers.get('Authorization')

#         if token and (token.startswith("Bearer ") or token.startswith("Token ")):
#             token = token.split(" ")[1]

#         if not token:
#             raise PermissionDenied("Token is required.")

#         try:
#             print("hello there",default_ist_time())
#             print("cueent",timezone.now())
#             valid_session_exists = UserLoginLog.objects.filter(token=token,token_expiration_time__gt=timezone.now()).exists()


#             if not valid_session_exists:
#                 raise PermissionDenied("Your token has expired or is invalid for this session.")

#             # Validate the user associated with the token
#             user_log = UserLoginLog.objects.filter(token=token).first()  # Fetch at least one login log to get the user

#             if not user_log:
#                 raise PermissionDenied("Invalid token or user does not exist.")

#             user = user_table.objects.get(id=user_log.user.id)  # Get user from user_log
            
#             # Ensure the user has the 'Admin' role and is active
#             if user.user_role and user.user_role.role_name == 'Admin' and user.user_role.status == 'active':
#                 return True
#             else:
#                 raise PermissionDenied("You are not authorized to access this resource. Admin role is required.")

#         except user_table.DoesNotExist:
#             raise PermissionDenied("Invalid token or user does not exist.")

#         return False

class IsAdminWithToken(BasePermission):
    """
    Allows access only to users with a valid token and the role 'Admin'.
    Also ensures that the token has not expired.
    """
    def has_permission(self, request, view):
        token = request.headers.get('Authorization')

        if token and (token.startswith("Bearer ") or token.startswith("Token ")):
            token = token.split(" ")[1]

        if not token:
            raise PermissionDenied("Token is required.")

        try:
            # Print the current time and the expiration time for debugging
            print("hello there", default_ist_time())  # The current time in IST
            print("current time (timezone.now())", timezone.now())  # The current time in the configured timezone (UTC by default)
            print(token,"token")
            # Fetch the token expiration time from the database
            user_log = UserLoginLog.objects.filter(token=token).first()
            if user_log:
                print("Stored token expiration time:", user_log.token_expiration_time)
            else:
                print("No matching record found for the token.")

            # Check if the token expiration time is greater than the current time
            valid_session_exists = UserLoginLog.objects.filter(token=token, token_expiration_time__gt=timezone.now()).exists()
            
            if not valid_session_exists:
                raise PermissionDenied("Your token has expired or is invalid for this session.")

            # Validate the user associated with the token
            if user_log:
                user = user_table.objects.get(id=user_log.user.id)  # Get user from user_log

                # Ensure the user has the 'Admin' role and is active
                if user.user_role and user.user_role.role_name == 'Admin' and user.user_role.status == 'active':
                    return True
                else:
                    raise PermissionDenied("You are not authorized to access this resource. Admin role is required.")

        except user_table.DoesNotExist:
            raise PermissionDenied("Invalid token or user does not exist.")
        except Exception as e:
            print(f"Error occurred: {e}")
            raise PermissionDenied("An error occurred during authorization.")

        return False



class IsSecretaryWithToken(BasePermission):
    """
    Allows access only to users with a valid token and the role 'Student Secretary'.
    Also ensures that the token has not expired.
    """

    def has_permission(self, request, view):
        token = request.headers.get('Authorization')

        if token and (token.startswith("Bearer ") or token.startswith("Token ")):
            token = token.split(" ")[1]

        if not token:
            raise PermissionDenied("Token is required.")

        try:
            # Check if the token has any valid session (not expired)
            valid_session_exists = UserLoginLog.objects.filter(
                token=token,
                token_expiration_time__gt=default_ist_time()
            ).exists()

            if not valid_session_exists:
                raise PermissionDenied("Your token has expired or is invalid for this session.")

            # Validate the user associated with the token
            user_log = UserLoginLog.objects.filter(token=token).first()  # Fetch at least one login log to get user
            
            if not user_log:
                raise PermissionDenied("Invalid token or user does not exist.")
            
            user = user_table.objects.get(id=user_log.user.id)  # Get user from user_log
            
            # Check if the user has 'Student Secretary' role and is active
            if user.user_role and user.user_role.role_name == 'Student Secretary' and user.user_role.status == 'active':
                user_email = user.user_email

                # Extract reg_id(s) from the request
                reg_ids_from_request = []
                
                # Handle case when request.data is a dictionary
                if isinstance(request.data, dict):
                    reg_id_from_request = (
                        request.resolver_match.kwargs.get("reg_id") or  # From view kwargs
                        request.data.get("reg_id") or  # From POST/PUT request body
                        request.query_params.get("reg_id")  # From GET query params
                    )
                    if reg_id_from_request:
                        reg_ids_from_request.append(reg_id_from_request)

                # Handle case when request.data is a list
                elif isinstance(request.data, list):
                    for entry in request.data:
                        if isinstance(entry, dict):
                            reg_id = entry.get("reg_id")
                            if reg_id:
                                reg_ids_from_request.append(reg_id)

                # Debugging: Log reg_ids from the request
                print(f"reg_ids from request: {reg_ids_from_request}")

                # Validate reg_ids
                if not reg_ids_from_request:
                    raise PermissionDenied("At least one reg_id is required in the request.")

                for reg_id in reg_ids_from_request:
                    # Validate each reg_id against the EntityRegistration model
                    if not EntityRegistration.objects.filter(
                        Secretary_email=user_email,
                        reg_id=reg_id
                    ).exists():
                        raise PermissionDenied(f"Registration not found for reg_id: {reg_id}")

                print("All reg_ids are valid.")
                return True
            else:
                raise PermissionDenied("You are not authorized to access this resource.")

        except user_table.DoesNotExist:
            raise PermissionDenied("Invalid token or user does not exist.")
        except EntityRegistration.DoesNotExist:
            raise PermissionDenied("Registration not found.")

        return False



class IsFacultyWithToken(BasePermission):
    """
    Allows access only to users with a valid token and the role 'Faculty Advisory'.
    Also ensures that the token has not expired.
    """

    def has_permission(self, request, view):
        token = request.headers.get('Authorization')

        if token and (token.startswith("Bearer ") or token.startswith("Token ")):
            token = token.split(" ")[1]

        if not token:
            raise PermissionDenied("Token is required.")

        try:
            # Check if the token is valid and not expired
            valid_session_exists = UserLoginLog.objects.filter(
                token=token,
                token_expiration_time__gt=default_ist_time()
            ).exists()

            if not valid_session_exists:
                raise PermissionDenied("Your token has expired or is invalid for this session.")

            # Fetch user from token
            user_log = UserLoginLog.objects.filter(token=token).first()
            if not user_log:
                raise PermissionDenied("Invalid token or user does not exist.")

            user = user_table.objects.get(id=user_log.user.id)

            # Verify user role
            if user.user_role and user.user_role.role_name == 'Faculty Advisory' and user.user_role.status == 'active':
                user_email = user.user_email

                # Extract reg_id(s) from the request
                reg_ids_from_request = []

                # Case: request.data is a dictionary
                if isinstance(request.data, dict):
                    reg_id_from_request = (
                        request.resolver_match.kwargs.get("reg_id") or
                        request.data.get("reg_id") or
                        request.query_params.get("reg_id")
                    )
                    if reg_id_from_request:
                        reg_ids_from_request.append(reg_id_from_request)

                # Case: request.data is a list
                elif isinstance(request.data, list):
                    for entry in request.data:
                        if isinstance(entry, dict):
                            reg_id = entry.get("reg_id")
                            if reg_id:
                                reg_ids_from_request.append(reg_id)

                print(f"reg_ids from request: {reg_ids_from_request}")

                if not reg_ids_from_request:
                    raise PermissionDenied("At least one reg_id is required in the request.")

                for reg_id in reg_ids_from_request:
                    if not EntityRegistration.objects.filter(
                        faculty_advisory_email=user_email,
                        reg_id=reg_id
                    ).exists():
                        raise PermissionDenied(f"Registration not found for reg_id: {reg_id}")

                print("All reg_ids are valid for Faculty Advisory.")
                return True
            else:
                raise PermissionDenied("You are not authorized to access this resource.")

        except user_table.DoesNotExist:
            raise PermissionDenied("Invalid token or user does not exist.")
        except EntityRegistration.DoesNotExist:
            raise PermissionDenied("Registration not found.")

        return False

class IsCoordinatorWithToken(BasePermission):
    """
    Allows access only to active coordinators with a valid token, active status,
    and a matching department ID.
    """

    def has_permission(self, request, view):
        token = request.headers.get('Authorization')

        if token and (token.startswith("Bearer ") or token.startswith("Token ")):
            token = token.split(" ")[1]

        if not token:
            raise PermissionDenied("Token is required.")

        try:
            # Fetch the token expiration time from the database
            user_log = UserLoginLog.objects.filter(token=token).first()

            if not user_log:
                raise PermissionDenied("Invalid token or session.")

            # Check if the token is valid and not expired
            if not UserLoginLog.objects.filter(token=token, token_expiration_time__gt=now()).exists():
                raise PermissionDenied("Your token has expired or is invalid.")

            # Validate the user associated with the token
            user = user_log.user

            # Extract `department_id` from the view kwargs or request data
            requested_department_id = (
                request.resolver_match.kwargs.get("department_id") or  # From view kwargs
                request.data.get("department_id") or  # From POST/PUT request body
                request.query_params.get("department_id")  # From GET query params
            )
            if not requested_department_id:
                raise PermissionDenied("Department ID is required in the request or URL.")

            # Check user status, coordinator status, and department ID
            if (
                user.is_cordinator == 'active'
                and user.status == 'active'
                and str(user.dept_id.dept_id) == str(requested_department_id)
            ):
                return True
            else:
                raise PermissionDenied("You are not authorized to access this resource.")

        except Exception as e:
            print(f"Error occurred: {e}")
            raise PermissionDenied("An error occurred during authorization.")

        return False

class IsEventManagerWithToken(BasePermission):
    """
    Allows access only to users with a valid token and the role 'Admin'.
    Also ensures that the token has not expired.
    """
    def has_permission(self, request, view):
        token = request.headers.get('Authorization')

        if token and (token.startswith("Bearer ") or token.startswith("Token ")):
            token = token.split(" ")[1]

        if not token:
            raise PermissionDenied("Token is required.")

        try:
            # Print the current time and the expiration time for debugging
            print("hello there", default_ist_time())  # The current time in IST
            print("current time (timezone.now())", timezone.now())  # The current time in the configured timezone (UTC by default)
            print(token,"token")
            # Fetch the token expiration time from the database
            user_log = UserLoginLog.objects.filter(token=token).first()
            if user_log:
                print("Stored token expiration time:", user_log.token_expiration_time)
            else:
                print("No matching record found for the token.")

            # Check if the token expiration time is greater than the current time
            valid_session_exists = UserLoginLog.objects.filter(token=token, token_expiration_time__gt=timezone.now()).exists()
            
            if not valid_session_exists:
                raise PermissionDenied("Your token has expired or is invalid for this session.")

            # Validate the user associated with the token
            if user_log:
                user = user_table.objects.get(id=user_log.user.id)  # Get user from user_log

                # Ensure the user has the 'Admin' role and is active
                if user.user_role and user.user_role.role_name == 'Event Data Manager' and user.user_role.status == 'active':
                    return True
                else:
                    raise PermissionDenied("You are not authorized to access this resource. Event Data Manager role is required.")

        except user_table.DoesNotExist:
            raise PermissionDenied("Invalid token or user does not exist.")
        except Exception as e:
            print(f"Error occurred: {e}")
            raise PermissionDenied("An error occurred during authorization.")

        return False

