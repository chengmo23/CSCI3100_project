import { Request, Response } from 'express'
import Book from '../../models/Book'
import Category from '../../models/Category'
import spelling from 'spelling'
import dictionary from 'spelling/dictionaries/en_US'
import { categories } from '../../InitDB'

type Filters = {
  condition?: 'new' | 'used'
  listingType?: 'sell' | 'trade'
  category?: string // category id, with category, we assume searching book name or author
  price?: {
    max: number
    min: number
  }
}

const PRICE_RANGE_UPPER_BOUND = 500

// this API's input type
type Search = {
  keyword: string
  pageNum: number
  pageSize: number
  persist: boolean
  filters: Filters
  sort: 'similarity' | 'createdAt' | 'reviewNum'
}

const SearchController = {
  /**
   * search algo
   * these params are in the express request body
   * flow (details skipped):
   * 1. determine whether the keyword is a category
   * 2. if so then we search by category
   * 3. else see whether the keyword is mis-spelt
   * 4. if keyword is mis-spelt, then use suggested keyword to search for books
   * 5. else return search result of the keyword
   * # by default sort by similarity of keyword and search field (book name or author)
   * @param keywrod keyword for searching
   * @param pageSize number of books to be returned
   * @param pageNum current page number, for skipping books with pageSize
   * @param persist whether not to use the suggested keyword to search
   * @param filters filter object for filtering different fields
   * @param sort sort object for sorting in different methods
   * @return array of Book objects
   */
  search: async (req: Request, res: Response): Promise<unknown> => {
    const { pageNum, pageSize, persist, filters, sort } = <Search>(<unknown>req.body)
    const keyword = req.body.keyword.toLowerCase() // case insensitive searching
    let suggestion = ''

    if (!keyword) return res.status(400).send({ message: 'Enter something' })

    if (keyword == '*')
      return res.status(200).send({
        books: reduce(
          await Book.find().populate('reviews').populate('category').populate('sellerId').exec(),
          pageSize,
          pageNum,
          filters,
          sort,
        ),
        suggestion: '',
      })

    const category = isCategory(keyword) ? await Category.findOne({ name: keyword }) : null // find the catrgory id
    if (category && !filters.category) {
      // keyword is a category
      return res.status(200).send({
        books: reduce(await findBookByCategory(category._id), pageSize, pageNum, filters, sort),
        suggestion: '',
      })
    } else {
      // see whether keyword matches any book name
      let booksMatchKeywordInName = await findBookByName(keyword)
      // see whether keyword matches any author
      let booksMatchKeywordInAuthor = await findBookByAuthor(keyword)
      // if no book found on that keyword, we try to suggest keyword
      if (
        !persist &&
        booksMatchKeywordInName.length <= 0 &&
        booksMatchKeywordInAuthor.length <= 0 &&
        !isCategory(keyword)
      ) {
        suggestion = getSuggestion(keyword) // suggestion or empty string
        booksMatchKeywordInName = await findBookByName(suggestion) // use suggestion to find books
      }

      // found book with suggestion or keyword
      if (booksMatchKeywordInName.length > 0) {
        if (booksMatchKeywordInAuthor.length > 0)
          // merge author results as well
          booksMatchKeywordInName = merge(booksMatchKeywordInName, booksMatchKeywordInAuthor)
        return res
          .status(200)
          .send({ books: reduce(booksMatchKeywordInName, pageSize, pageNum, filters, sort), suggestion: suggestion })
      } else {
        // book not found, then give author
        // leave search by author results to the last if any, cuz book names grabs more attention in our UI
        if (suggestion) {
          booksMatchKeywordInAuthor = await findBookByAuthor(suggestion)
        }
        if (booksMatchKeywordInAuthor.length > 0) {
          return res.status(200).send({
            books: reduce(booksMatchKeywordInAuthor, pageNum, pageSize, filters, sort),
            suggestion: suggestion,
          })
        } else {
          return res.status(200).send({ books: [], suggestion: suggestion })
        }
      }
    }
  },
}

/**
 * determine whether a keyword is a category
 *
 * @param keyword
 * @returns true if keyword is a category else false
 */
const isCategory = (keyword: string) => {
  for (const category of categories) {
    if (category.name == keyword) return true
  }
  return false
}

/**
 * merge two array of books without duplication
 *
 * @param books1 first array of books
 * @param books2 second array of books
 * @returns merged array of books
 */
const merge = (books1: Array<any>, books2: Array<any>) => {
  const ids = flattenResult(books1, '_id')
  const result = [
    ...books1,
    ...books2.filter((book) => {
      return !ids.some((id) => id.toString() == book._id.toString())
    }),
  ]
  return result
}

/**
 * reduce the book objects in an array
 *
 * @param books array of book objects to be reduced
 * @param pageSize size of each page
 * @param pageNum  number of current page
 * @param filters filter config
 * @param sort sorting method
 * @returns reduced array of books
 */
const reduce = (
  books: Array<any>,
  pageSize: number,
  pageNum: number,
  filters: Filters,
  sort: 'similarity' | 'createdAt' | 'reviewNum',
) => {
  let result = books
  const start = (pageNum - 1) * pageSize
  const end = start + pageSize
  result = filterResult(result, filters)
  result = sortResult(result, sort)
  return result.slice(start, end)
}

/**
 * return array of books that meets the filtering condition
 *
 * @param books array of books to be filtered
 * @param filters filter config
 * @returns filtered array of books
 */
const filterResult = (books: Array<any>, filters: Filters) => {
  let result = books
  if (filters.category) result = result.filter((book) => book['category']._id == filters.category)

  if (filters.condition) result = result.filter((book) => book['condition'] == filters.condition)

  if (filters.listingType) result = result.filter((book) => book['type'] == filters.listingType)

  if (filters.price) {
    const max = filters.price.max
    const min = filters.price.min
    if (filters.price.max >= PRICE_RANGE_UPPER_BOUND) result = result.filter((book) => book['price'] >= min)
    else result = result.filter((book) => book['price'] >= min && book['price'] <= max)
  }

  return result
}

/**
 * sort array of books
 *
 * @param books array of books to be sorted
 * @param sort sorting config
 * @returns sorted array of books
 */
const sortResult = (books: Array<any>, sort: 'similarity' | 'createdAt' | 'reviewNum') => {
  let result = books
  if (sort == 'createdAt') result = result.sort((a, b) => b.createdAt - a.createdAt)
  if (sort == 'reviewNum') result = result.sort((a, b) => b.reviews.length - a.reviews.length)
  return result
}

/**
 * check whether a keyword spelt wrongly and return suggestion
 *
 * @param keyword
 * @returns empty string if no suggestion, else return suggested keyword
 */
const getSuggestion = (keyword: string): string => {
  const dict = new spelling(dictionary)
  let suggestion = ''
  let suggested = false
  const tmp: Array<string> = []
  keyword.split(' ').forEach((word) => {
    const lookup = dict.lookup(word)
    if (!lookup.found) {
      if (lookup.suggestions.length > 0) {
        tmp.push(lookup.suggestions[0].word)
        suggested = true
      } else tmp.push(word)
    } else tmp.push(word)
  })
  if (suggested) suggestion = tmp.join(' ')
  return suggestion
}

/**
 * find books from DB by category
 *
 * @param categoryId category id
 * @returns array of books
 */
const findBookByCategory = async (categoryId: string) => {
  const result = await Book.find({ category: categoryId })
    .populate('category')
    .populate('sellerId')
    .populate('reviews')
    .exec()
  return result
}

/**
 * find books from DB by book name ( treat keyword as book name)
 *
 * @param keyword
 * @returns array of books
 */
const findBookByName = async (keyword: string) => {
  const bookList = await Book.find().populate('category').populate('sellerId').populate('reviews').exec()
  const wordsOfKeyword = keyword.split(' ')
  let result: Array<any> = []
  bookList.forEach((book) => {
    const bookSimilarInName = getBookByName(book, wordsOfKeyword)
    if (bookSimilarInName) result.push(bookSimilarInName)
  })
  result.sort(sortBySimilarity)
  result = flattenResult(result, 'book')
  return result // arraged by similarity
}

/**
 * find books from DB by author name ( treat keyword as author name)
 *
 * @param keyword
 * @returns array of books
 */
const findBookByAuthor = async (keyword: string) => {
  const bookList = await Book.find().populate('category').populate('sellerId').populate('reviews').exec()
  const wordsOfKeyword = keyword.split(' ')
  let result: Array<any> = []
  bookList.forEach((book) => {
    const bookSimilarInAuthor = getBookByAuthor(book, wordsOfKeyword)
    if (bookSimilarInAuthor) result.push(bookSimilarInAuthor)
  })
  result.sort(sortBySimilarity)
  result = flattenResult(result, 'book')
  return result // arraged by similarity
}

/**
 * similarity sorting function for Javascript's Array.prototype.sort
 *
 * @param a object with similarity field
 * @param b object with similarity field
 * @returns -1 if a has higher similarity, 1 if b has higher similarity, 0 if same
 */
const sortBySimilarity = (a: { similarity: number }, b: { similarity: number }) => {
  if (a.similarity > b.similarity) return -1
  if (a.similarity < b.similarity) return 1
  return 0
}

/**
 * get an array of results with given keys, in or case, it is for omitting the similarity field
 *
 * @param results book results in array of objects
 * @param key the key to be flattened
 * @returns flattened array of result objects
 */
const flattenResult = (results: Array<any>, key: string) => results.map((result) => result[key])

/**
 * get array of books by book name and take string similarity into consideration
 *
 * @param book array of books
 * @param wordsOfKeyword array of words which is splitted from keyword
 * @returns array of books with similarity
 */
const getBookByName = (book: any, wordsOfKeyword: Array<string>) => {
  let cnt = 0
  const wordsOfBookName = book['name'].toLowerCase().split(' ')
  const usedHash = new Array(wordsOfBookName.length).fill(false) // whether the word of book name is used for calculating similarity
  let sumOfSimilarity = 0 // sum of similarity of all words, for sorting by similarity
  for (let i = 0; i < wordsOfKeyword.length; i++) {
    for (let j = 0; j < wordsOfBookName.length; j++) {
      if (usedHash[j]) continue
      const similarity = jaroWinkler(wordsOfKeyword[i], wordsOfBookName[j]) // for relevancy sorting
      if (wordsOfKeyword[i] == wordsOfBookName[j]) {
        usedHash[j] = true
        cnt++
        sumOfSimilarity += similarity
        break
      }
    }
  }
  if (cnt > wordsOfKeyword.length / 3) return { book: book, similarity: sumOfSimilarity }
}

/**
 * get array of books by author and take string similarity into consideration
 *
 * @param book array of books
 * @param wordsOfKeyword array of words which is splitted from keyword
 * @returns array of books with similarity
 */
const getBookByAuthor = (book: any, wordsOfKeyword: Array<string>) => {
  let cnt = 0
  const wordsOfAuthor = book['author'].toLowerCase().split(' ')
  const usedHash = new Array(wordsOfAuthor.length).fill(false) // whether the word of book name is used for calculating similarity
  let sumOfSimilarity = 0 // sum of similarity of all words, for sorting by similarity
  for (let i = 0; i < wordsOfKeyword.length; i++) {
    for (let j = 0; j < wordsOfAuthor.length; j++) {
      if (usedHash[j]) continue
      const similarity = jaroWinkler(wordsOfKeyword[i], wordsOfAuthor[j]) // for relevancy sorting
      if (wordsOfKeyword[i] == wordsOfAuthor[j]) {
        usedHash[j] = true
        cnt++
        sumOfSimilarity += similarity
        break
      }
    }
  }
  // all words with more than 0.92 similarity
  if (cnt >= wordsOfKeyword.length) return { book: book, similarity: sumOfSimilarity }
}

/**
 * jaroWinkler algo for measuring the edit distance of 2 strings
 *
 * @param s1 first string
 * @param s2 second string
 * @returns edit distance
 */
const jaroWinkler = (s1: string, s2: string): number => {
  if (s1.length === 0 || s2.length === 0) return 0 // base case

  // non case sensitive
  s1 = s1.toLowerCase()
  s2 = s2.toLowerCase()

  if (s1 === s2) return 1 // match exactly

  // Number of matches
  let matches = 0

  const maxDist = Math.floor(Math.max(s1.length, s2.length) / 2) - 1

  // Hash of matches for transpoitions calculation
  const s1Hash = new Array(s1.length)
  const s2Hash = new Array(s2.length)

  for (let i = 0; i < s1.length; i++) {
    // loop over the first string
    for (let j = Math.max(0, i - maxDist); j <= Math.min(s2.length, i + maxDist + 1); j++) {
      // check for matches
      if (!s1Hash[i] && !s2Hash[j] && s1[i] === s2[j]) {
        matches++
        s1Hash[i] = s2Hash[j] = true
        break
      }
    }
  }

  if (matches === 0) return 0 // no matches

  let t = 0 // transpositions
  let point = 0

  // count transpositions
  for (let i = 0; i < s1.length; i++) {
    if (s1Hash[i]) {
      while (!s2Hash[point]) {
        point++
      }

      if (s1.charAt(i) !== s2.charAt(point++)) t++
    }
  }

  t /= 2

  let dist = (matches / s1.length + matches / s2.length + (matches - t) / matches) / 3
  let prefix = 0 // maxium 4 character prefix

  if (dist > 0.7) {
    const minIndex = Math.min(s1.length, s2.length)
    let i = 0
    while (s1[i] === s2[i] && i < 4 && i < minIndex) {
      ++prefix
      i++
    }

    dist += 0.1 * prefix * (1 - dist)
  }

  return dist
}

export default SearchController
