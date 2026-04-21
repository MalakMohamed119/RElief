/* src/app/core/models/api.models.ts - COMPLETE API DTOs - STRICT BUILD FIX */

export interface AuthResponseDTO {
  token: string;
  role: string;
  userId: string;
  isEmailVerified?: boolean;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterResponseDTO {
  message: string;
  userId: string;
  email: string;
}

export interface VerifyEmailDTO {
  email: string;
  code: string;
}

export interface ResendCodeDTO {
  email: string;
}

export interface ForgotPasswordDTO {
  email: string;
}

export interface ResetPasswordDTO {
  email: string;
  code: string;
  newPassword: string;
}

export interface AcceptShiftDto {
  shiftId: string;
  jobRequestItemId: string;
  applicationId?: string;
}

export interface RejectShiftDto {
  jobRequestItemId: string;
  applicationId?: string;
  reason?: string;
}

export interface CancelApplicationDto {
  jobRequestItemId: string;
  applicationId?: string;
}

export interface ProfileDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  address: any;
  verificationStatus: string;
  rejectionReason?: string | null;
  isProfileCompleted: boolean;
  isVerified?: boolean;
  profilePhoto?: { url: string; id: string; fileName: string } | null;
  proofIdentityType?: string | null;
  proofIdentityFile?: any | null;
  insuranceFile?: any | null;
  pswCertificateFile?: any | null;
  cvFile?: any | null;
  immunizationRecordFile?: any | null;
  criminalRecordFile?: any | null;
  firstAidOrCPRFile?: any | null;
}

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  address?: any;
}

export interface CreateJobOfferDto {
  title: string;
  description: string;
  position: string;
  address: string;
  address2: string;
  city: string;
  province: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  hourlyRate: number;
  shifts: Array<{
    startTime: string;
    endTime: string;
    date: string;
  }>;
}

export interface UpdateJobOfferDto extends Partial<CreateJobOfferDto> {
  id: string;
}

export interface ApplyToOfferDto {
  offerId: string;
  pswId?: string;
  message?: string;
  shiftIds?: string[];
}

