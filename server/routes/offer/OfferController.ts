import { Request, Response } from 'express'
import Offer from '../../models/Offer'
import { CreateOffer, DeleteOffer, ListOfferBySeller } from './params'

const OfferController = {
  createOffer: async (req: Request, res: Response): Promise<void> => {
    const newOffer = <CreateOffer>(<unknown>req.body)
    Offer.create(newOffer, (err: any, data: any) => {
      if (err) return res.status(400).send(err)
      res.status(200).send(data)
    })
  },
  deleteOffer: async (req: Request, res: Response): Promise<void> => {
    const { id } = <DeleteOffer>(<unknown>req.body)
    Offer.deleteOne({ _id: id }).then((data) => {
      res.status(200).send(data)
    })
  },
  listOfferBySeller: async (req: Request, res: Response): Promise<void> => {
    const { sellerId } = <ListOfferBySeller>(<unknown>req.params)
    Offer.find({ sellerId: sellerId })
      .populate('buyerId')
      .populate('sellerId')
      .populate('book')
      .then((data) => {
        res.status(200).send(data)
      })
  },
}

export default OfferController
