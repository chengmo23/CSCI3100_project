import { Request, Response, Router } from 'express'
import { Routes } from '..'
import CategoryController from './CategoryController'

export class CategoryRoutes extends Routes {
  constructor(router: Router) {
    super(router, 'Category')
  }
  configureRoutes() {
    this.router.route(`/category`).get((req: Request, res: Response) => {
      CategoryController.listCategories(req, res)
    })
  }
}
