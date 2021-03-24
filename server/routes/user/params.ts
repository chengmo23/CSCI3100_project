// clear listing of params for APIs
import mongoose from 'mongoose'

export type ListUsers = {
  status?: string
}

export type CreateUser = {
  email: string
  username: string
  firstname: string
  lastname: string
  password: string
  status: string
  interests: Array<string>
}

export type Login = {
  emailOrUsername: string
  password: string
}

export type GetUser = {
  userId: string
}

export type DeleteUser = {
  userId: string
}

export type AddInterests = {
  userId: string
  interestIds: string[]
}
