import { Card, DialogTitle, Divider, DialogContent, Button, DialogActions, TextField } from '@material-ui/core'
import SearchBar from '@src/components/searchBar'
import Tooltip from '@src/components/tooltip'
import React, { ChangeEvent, ReactElement, useEffect, useState } from 'react'
import ReviewSection from './reviewSection'
import ShareOutlinedIcon from '@material-ui/icons/ShareOutlined'
import DeleteForeverOutlinedIcon from '@material-ui/icons/DeleteForeverOutlined'
import ChatBubbleOutlineOutlinedIcon from '@material-ui/icons/ChatBubbleOutlineOutlined'
import { checkIntegrity, formNoErr, toData, VALIDATORS } from '@src/formIntegrity'
import {
  Container,
  ProductInfo,
  ProductWrapper,
  Image,
  InfoTextSection,
  Title,
  DescriptionText,
  Href,
  FlexRow,
  SellIcon,
  TradeIcon,
  Highlighted,
  ConditionIcon,
  ConditionText,
  DescriptionIcon,
  ChatBtn,
  CategoryIcon,
  ShareBtn,
  TimeIcon,
  TimeText,
  ImageWrapper,
  DeleteBtn,
} from './style'
import { getUrlLastSegmant, toStandardTime } from '@src/utils'
import RecommendationSection from './recommendationSection'
import { useSnackbar } from 'notistack'
import BookService from '@src/services/BookService'
import { Obj } from '@myTypes/Obj'
import { useUserState } from '@src/context/UserContext'
import { LOCATIONS, toPath } from '@src/routes'
import { useHistory } from 'react-router-dom'
import { InfoDialog } from '../profileView/style'
import { LocalOfferOutlined } from '@material-ui/icons'

type Props = {
  children?: ReactElement
}

const book = {
  name: 'Discrete Mathematics and Its Application',
  type: 'sell', // or trade
  price: '120', // or ''
  tradeOption: '', // or 'I want to trade a Calculus book'
  author: 'Kenneth H. Rosen',
  category: 'Math',
  description: 'trade at MTR station.',
  createdAt: new Date('2021-04-07T07:45:27.791+00:00').getTime(),
  condition: 'New', // or 'used' just to make the product view richer
  reviews: [
    {
      _id: 'object Id of this review',
      by: {
        _id: 'object Id of this user',
        username: '',
        firstname: '',
        lastname: '',
        // etc. user info... populate in backend
      },
      content: 'a',
      createdAt: new Date('2021-04-07T07:45:27.791+00:00').getTime(),
    },
    {
      _id: 'object Id of this review',
      by: {
        _id: 'object Id of this user',
        username: '',
        firstname: '',
        lastname: '',
        // etc. user info... populate in backend
      },
      content: 'This book is good. Test string. Test string. Test string. Test string. ',
      createdAt: new Date('2021-04-07T07:45:27.791+00:00').getTime(),
    },
    {
      _id: 'object Id of this review',
      by: {
        _id: 'object Id of this user',
        username: '',
        firstname: '',
        lastname: '',
        // etc. user info... populate in backend
      },
      content: 'This book is good Test string. Test string. Test string. ',
      createdAt: new Date('2021-04-07T07:45:27.791+00:00').getTime(),
    },
    {
      _id: 'object Id of this review',
      by: {
        _id: 'object Id of this user',
        username: '',
        firstname: '',
        lastname: '',
        // etc. user info... populate in backend
      },
      content: 'This book is good.',
      createdAt: new Date('2021-04-07T07:45:27.791+00:00').getTime(),
    },
  ],
}

const ProductView = (props: Props): ReactElement => {
  const { ...rest } = props
  const [loading, setLoading] = useState(true)
  const [book, setBook] = useState<Obj>({})
  const { loggedIn } = useUserState()
  const history = useHistory()
  const userState = useUserState()
  const [open, setOpen] = useState(false)
  const { enqueueSnackbar } = useSnackbar()
  const { state } = useUserState()
  const [input, setInput] = useState({
    contact: { value: '', errMsg: '' },
  })

  useEffect(() => {
    getBook()
  }, [])

  const getBook = (): void => {
    BookService.getBook(getUrlLastSegmant())
      .then((res) => {
        setLoading(false)
        console.log(res)
        setBook(res)
      })
      .catch((err) => {
        console.log(err)
        setLoading(false)
        // book not found
      })
  }

  const handleShareOnClick = () => {
    console.log(book.sellerId)
    console.log(userState.state)
    navigator.clipboard.writeText(location.href)
    enqueueSnackbar('Copied URL to clipboard', { variant: 'info' })
  }

  const handleImageOnClick = (url: string) => window.open(url, '_blank')

  const handleChatBtnOnClick = () => {
    if (!loggedIn()) return enqueueSnackbar('Please Login First.', { variant: 'warning' })
    else history.push(toPath(LOCATIONS.chat, book._id as string))
  }

  const handleMakeOfferClick = () => {
    if (!loggedIn()) return enqueueSnackbar('Please Login First.', { variant: 'warning' })
    else setOpen(true)
  }

  const handleDeleteOnClick = () => {
    BookService.deleteBook(book._id as string)
      .then(() => {
        enqueueSnackbar('Book listing deleted.', { variant: 'success' })
        history.push(toPath(LOCATIONS.profile))
      })
      .catch((err) => {
        console.log(err)
        enqueueSnackbar('Please try again later.', { variant: 'error' })
      })
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const nextState = input
    nextState[e.target.name as keyof typeof input] = { value: e.target.value, errMsg: '' }
    setInput({ ...nextState })
  }

  const handleSubmitContact = () => {
    const contact = checkIntegrity(input.contact, [VALIDATORS.REQUIRED])
    setInput({ ...input, contact })
    if (formNoErr(input)) {
      BookService.addOffer(
        book._id as string,
        input.contact.value,
        (state as any)._id as string,
        (book.sellerId as any)?._id,
      )
        .then((res) => {
          enqueueSnackbar('Offer made, seller will contact you if they accept it.', { variant: 'success' })
          setOpen(false)
        })
        .catch((err) => {
          console.log(err)
          enqueueSnackbar('Plaese try again later.', { variant: 'error' })
          setOpen(false)
        })
    }
  }

  const search = (keyword: string) => {
    history.push(toPath(LOCATIONS.search, keyword))
  }

  return (
    <ProductWrapper>
      <SearchBar />
      <Container>
        <ProductInfo>
          <ImageWrapper onClick={() => handleImageOnClick(book.img as string)}>
            <Image src={book.img as string} />
          </ImageWrapper>
          <InfoTextSection>
            <Title>{`${book.name}`}</Title>
            <Tooltip title="Author" style={{ fontSize: '14px' }}>
              <Href
                onClick={() => {
                  search(book.author as string)
                }}
              >{`${book.author}`}</Href>
            </Tooltip>
            <Divider />
            <ImageWrapper onClick={() => handleImageOnClick(book.img as string)} isMobile>
              <Image src={book.img as string} />
            </ImageWrapper>
            {book.type == 'sell' ? (
              <Tooltip title="For sell" style={{ fontSize: '14px' }}>
                <FlexRow>
                  <SellIcon />
                  <Highlighted>{`${book.price}`}</Highlighted>
                </FlexRow>
              </Tooltip>
            ) : (
              <Tooltip title="For trade" style={{ fontSize: '14px' }}>
                <FlexRow>
                  <TradeIcon />
                  <Highlighted>{`${book.tradeOption}`}</Highlighted>
                </FlexRow>
              </Tooltip>
            )}
            <Tooltip title="Category" style={{ fontSize: '14px' }}>
              <FlexRow>
                <CategoryIcon />
                <Href
                  onClick={() => {
                    search((book.category as any)?.name)
                  }}
                >{`${(book.category as any)?.name}`}</Href>
              </FlexRow>
            </Tooltip>
            <Tooltip title="Condition" style={{ fontSize: '14px' }}>
              <FlexRow>
                <ConditionIcon />
                <ConditionText>{`${book.condition}`}</ConditionText>
              </FlexRow>
            </Tooltip>
            {book.description && (
              <Tooltip title="Description" style={{ fontSize: '14px' }}>
                <FlexRow>
                  <DescriptionIcon />
                  <DescriptionText>{`${book.description}`}</DescriptionText>
                </FlexRow>
              </Tooltip>
            )}
            <Tooltip title="Listing time" style={{ fontSize: '14px' }}>
              <FlexRow>
                <TimeIcon />
                <TimeText>{`${toStandardTime(book.createdAt as string)}`}</TimeText>
              </FlexRow>
            </Tooltip>
            {(book.sellerId as Obj)?._id == userState.state._id && userState.loggedIn() ? (
              <DeleteBtn startIcon={<DeleteForeverOutlinedIcon />} onClick={handleDeleteOnClick}>
                Delete this listing
              </DeleteBtn>
            ) : (
              <>
                <ChatBtn onClick={handleMakeOfferClick} startIcon={<LocalOfferOutlined />}>
                  Make an offer
                </ChatBtn>
                <ChatBtn onClick={handleChatBtnOnClick} startIcon={<ChatBubbleOutlineOutlinedIcon />}>
                  Chat with seller
                </ChatBtn>
              </>
            )}
            <ShareBtn startIcon={<ShareOutlinedIcon />} onClick={handleShareOnClick}>
              Share
            </ShareBtn>
          </InfoTextSection>
        </ProductInfo>
      </Container>
      <InfoDialog
        open={open}
        onClose={() => {
          setOpen(false)
        }}
      >
        <DialogTitle>{'Make an offer'}</DialogTitle>
        <DialogContent dividers>
          <DialogContent>
            <TextField
              id="contact-input"
              name="contact"
              label="Contact"
              type="contact"
              autoComplete="current-contact"
              variant="outlined"
              error={!!input.contact.errMsg}
              helperText={input.contact.errMsg}
              onChange={handleInputChange}
            />
          </DialogContent>
        </DialogContent>
        <DialogActions>
          <Button autoFocus onClick={handleSubmitContact} color="primary">
            Submit
          </Button>
        </DialogActions>
      </InfoDialog>
      <ReviewSection bookId={book._id as string} reviews={book.reviews as any[]} getBook={getBook}></ReviewSection>
      <RecommendationSection exclude={book._id as string} ready={!loading} callback={getBook} />
    </ProductWrapper>
  )
}

export default ProductView
