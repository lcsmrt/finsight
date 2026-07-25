export interface LoginRequest {
  body: {
    email: string;
    password: string;
  };
}

export interface LoginResponse {
  token: string;
}
