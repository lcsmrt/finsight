export interface User {
  id: number;
  name: string;
  email: string;
}

export interface RegisterUserRequest {
  body: {
    name: string;
    email: string;
    password: string;
  };
}
