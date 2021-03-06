import { Request, Response } from 'express'
import Book from '../../models/Book'
import Category from '../../models/Category'
import {
  CreateBook,
  DeleteBook,
  GetBook,
  ListBooks,
  Search,
  AdvancedSearch,
  FindByCategory,
  DeleteByCategory,
  Pagination,
  ListBookBySellerId,
} from './params'
import mongoose from 'mongoose'
import Chat from '../../models/Chat'

const BookController = {

  // list all the books

  // list all books

  listBooks: async (req: Request, res: Response): Promise<void> => {
    const { status } = <ListBooks>(<unknown>req.body)
    const query = status ? { status: status } : {}
    Book.find(query)
      .populate('category')
      .populate('reviews')
      .populate('sellerId')
      .sort({ createdAt: -1 })
      .exec((err, data) => {
        if (err) {
          return res.status(500).send({ message: 'Error in getting books from DB' })
        }
        res.status(200).send(data)
      })
  },


  // create the book

  // craete a book

  createBook: async (req: Request, res: Response): Promise<void> => {
    req.body.category = mongoose.Types.ObjectId(req.body.category._id)
    const newBook = <CreateBook>(<unknown>req.body)
    Book.create(newBook, (error, data) => {
      if (error) return res.status(200).send({ message: 'error creating book' })
      res.status(200).send(data)
    })
  },


  // get the book by book ID

  // get book by book id

  getBook: async (req: Request, res: Response): Promise<void> => {
    console.log(req.params)
    const { bookId } = <GetBook>(<unknown>req.params)
    try {
      const _id = mongoose.Types.ObjectId(bookId)
      Book.findOne({ _id: _id })
        .populate('category')
        .populate('reviews')
        .populate('sellerId')
        .exec((err, data) => {
          if (err) {
            return res.status(500).send({ message: 'error finding book' })
          }
          res.status(200).send(data)
        })
    } catch (e) {
      console.log(e)
      res.status(500).send({ message: 'invalid bookId' })
    }
  },


  // delete the book by book ID

  // delete book by book id

  deleteBook: async (req: Request, res: Response): Promise<void> => {
    const { bookId } = <DeleteBook>(<unknown>req.params)
    try {
      const _id = mongoose.Types.ObjectId(bookId)
      Book.deleteOne({ _id: _id }, {}, (err: any) => {
        if (err) return res.status(500).send(err)
        Chat.deleteOne({ book: _id }, {}, (err: any) => {
          if (err) return res.status(500).send(err)
          res.status(200).send({ message: 'book deleted' })
        })
      })
    } catch (e) {
      res.status(500).send({ message: 'invalid bookId' })
    }
  },


  // list books by category

  // list book by category id

  listByCategory: async (req: Request, res: Response): Promise<void> => {
    const { categoryId } = <FindByCategory>(<unknown>req.params)
    const query = categoryId ? { category: categoryId } : {}
    Book.find(query, (err: any, data: any) => {
      if (err) return res.status(500).send({ message: 'Error in finding books by category' })
      res.status(200).send(data)
    })
  },


  // delete books by category

  // delete books by category id

  deleteByCategory: async (req: Request, res: Response): Promise<void> => {
    const { categoryId } = <DeleteByCategory>(<unknown>req.params)
    try {
      const _categoryId = mongoose.Types.ObjectId(categoryId)
      Book.deleteMany({ category: _categoryId }).then((err: any) => {
        if (err) {
          return res.status(500).send({ message: 'Error deleting all books of given categoyId' })
        }
      })
    } catch (e) {
      res.status(500).send({ message: 'invalid categoryId' })
    }
  },
  // simplest search function, deprecated
  // use the dedicated search algo in search route
  search: async (req: Request, res: Response): Promise<void> => {
    const { name, author } = <Search>(<unknown>req.body)
    let query = {}
    if (name && author) {
      query = { name: name, author: author }
    } else if (name) {
      console.log(req.body)
      query = { name: name }
    } else if (author) {
      console.log(req.body)
      query = { author: author }
    } else query = {}
    Book.find(query)
      .sort({ createdAt: -1 })
      .exec((err, data) => {
        if (err) {
          return res.status(500).send({ message: 'Error in getting books from DB' })
        }
        res.status(200).send(data)
      })
  },
  // simplest search function, deprecated
  // use the dedicated search algo in search route
  advancedSearch: async (req: Request, res: Response) => {
    console.log(req.body)
    const { name, price, category } = <AdvancedSearch>(<unknown>req.body)
    console.log(name)
    if (!name || !price) {
      res.status(404).send({ message: 'Book name, price must be entered' })
    }

    Book.find({ name: name }, { price: price })
      .sort({ createdAt: -1 })
      .exec((err, data) => {
        if (err) {
          return res.status(500).send({ message: 'Error in getting books from DB' })
        }
        res.status(200).send(data)
      })
  },
  // simplest search function, deprecated
  // use the dedicated search algo in search route
  pagination: async (req: Request, res: Response): Promise<void> => {
    const { pageNo, pageSize } = <Pagination>(<unknown>req.params)
    const pageNoInt = parseInt(pageNo)
    const pageSizeInt = parseInt(pageSize)
    Book.find()
      .sort({ createdAt: -1 })
      .skip(pageNoInt * pageSizeInt - pageSizeInt)
      .limit(pageSizeInt)
      .exec(function (err, data) {
        res.status(200).send(data)
      })
  },
  // list book by seller id
  listBookBySellerId: async (req: Request, res: Response) => {
    const { sellerId } = <ListBookBySellerId>(<unknown>req.params)
    Book.find({ sellerId: sellerId })
      .populate('category')
      .populate('reviews')
      .populate('sellerId')
      .then((data) => {
        res.status(200).send(data)
      })
  },
}

export default BookController
