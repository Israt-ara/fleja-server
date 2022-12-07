const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000;


const app = express();

// middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.xfbrdjn.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri)
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


//*******verify Jwt middleware start*************** //

function verifyJWT(req, res, next) {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })

}
//*******verify Jwt middleware end*************** //



async function run() {
    try {

        const shoesOptionCollection = client.db('fleja').collection('shoesCollection')
        const clothOptionCollection = client.db('fleja').collection('clothCollection')
        const bagOptionCollection = client.db('fleja').collection('bagCollection')
        const bookingsCollection = client.db('fleja').collection('bookings')
        const usersCollection = client.db('fleja').collection('users')
        const buyerCollection = client.db('fleja').collection('buyers')
        const sellerCollection = client.db('fleja').collection('sellers')
        const allProductCollection = client.db('fleja').collection('product')
        const itemCollection = client.db('fleja').collection('items')
        const paymentsCollection = client.db('fleja').collection('payments');


        //verify the admin ..Make sure you use verifyAdmin after verifyJwt
        // const verifyAdmin = async (req, res, next) => {
        //     console.log('inside verify admin', req.decoded.email)
        //     const decodedEmail = req.decoded.email;
        //     const query = { email: decodedEmail };
        //     const user = await usersCollection.findOne(query);

        //     if (user?.role !== 'admin') {
        //         return res.status(403).send({ message: 'forbidden access' })
        //     }

        //     next()
        // }



        //**********data loading start************//
        app.get('/shoesOptions', async (req, res) => {
            const query = {};
            const options = await shoesOptionCollection.find(query).toArray();
            res.send(options)
        })
        app.get('/clothOptions', async (req, res) => {
            const query = {};
            const options = await clothOptionCollection.find(query).toArray();
            res.send(options)
        })
        app.get('/bagOptions', async (req, res) => {
            const query = {};
            const options = await bagOptionCollection.find(query).toArray();
            res.send(options)
        })

        ////**********data loading end*************////

        //****************booking item start********************/

        app.get('/bookings', async (req, res) => {


            const query = {};
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings)
        })
        // app.get('/bookings', verifyJWT, async (req, res) => {
        //     const email = req.query.email;
        //     const decodedEmail = req.decoded.email;

        //     if (email !== decodedEmail) {
        //         return res.status(403).send({ message: 'forbidden access' });
        //     }

        //     const query = { email: email };
        //     const bookings = await bookingsCollection.find(query).toArray();
        //     res.send(bookings)
        // })

        /*
        
                app.get('/bookings', async (req, res) => {
                    const email = req.query.email;
                    // const decodedEmail = req.decoded.email;
        
                    // if (email !== decodedEmail) {
                    //     return res.status(403).send({ message: 'forbidden access' });
                    // }
        
                    const query = { email: email };
                    const bookings = await bookingsCollection.find(query).toArray();
                    res.send(bookings)
                })
        
        */

        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const booking = await bookingsCollection.findOne(query);
            res.send(booking)
        })
        app.post('/bookings', async (req, res) => {
            const booking = req.body
            console.log(booking)
            const result = await bookingsCollection.insertOne(booking)
            res.send(result)
        })

        //payment method
        app.post("/create-payment-intent", async (req, res) => {
            const booking = req.body;
            const price = booking.price;
            const amount = price * 100;  //price er amount k cent a nite hobe


            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })

        // app.post('/payments', async (req, res) => {
        //     const payment = req.body;
        //     const result = await paymentsCollection.insertOne(payment);
        //     const id = payment.bookingId
        //     const filter = { _id: ObjectId(id) }
        //     const updatedDoc = {
        //         $set: {
        //             paid: true,
        //             transactionId: payment.transactionId
        //         }
        //     }
        //     const updatedResult = await bookingsCollection.updateOne(filter, updatedDoc)
        //     res.send(result);
        // })

        //************ create users and get users and update users start******** */
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);

            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1d' })
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        });

        app.get('/users', async (req, res) => {

            const query = {}
            const users = await usersCollection.find(query).toArray();
            res.send(users)

        })






        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' });
        })
        app.get('/position/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await sellerCollection.findOne(query);
            res.send({ isSeller: user?.position === 'seller' });
        })

        app.get('/users', async (req, res) => {
            const email = req.query.email;
            const query = {};
            // const query = { email: email };
            const users = await usersCollection.findOne(query);
            res.send(users)

            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1d' })
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        });


        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result)
        })

        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(filter);
            res.send(result)
        })
        // app.delete('/users/:id', verifyJWT, verifyAdmin, async (req, res) => {
        //     const id = req.params.id;
        //     const filter = { _id: ObjectId(id) };
        //     const result = await usersCollection.deleteOne(filter);
        //     res.send(result)
        // })

        //************ create users and get users and update users end******** */




        //*********make an user admin start************/////


        app.put('/users/admin/:id', async (req, res) => {
            // const decodedEmail = req.decoded.email;
            // const query = { email: decodedEmail };
            // const user = await usersCollection.findOne(query);

            // if (user?.role !== 'admin') {
            //     return res.status(403).send({ message: 'forbidden access' })
            // }

            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })


        //buyer and seller collection
        app.get('/position/seller', async (req, res) => {


            const query = {};
            const seller = await sellerCollection.find(query).toArray();
            res.send(seller)
        })
        app.get('/position/buyer', async (req, res) => {


            const query = {};
            const buyer = await buyerCollection.find(query).toArray();
            res.send(buyer)
        })



        app.post('/position', async (req, res) => {
            const userr = req.body

            if (userr.position === "Seller") {
                const result = await sellerCollection.insertOne(userr)
                return res.send(result)
            }
            if (userr.position === "Buyer") {
                const result = await buyerCollection.insertOne(userr)
                return res.send(result)
            }


            const result = await buyerCollection.insertOne(userr)
            return res.send(result)
        })





        // app.put('/users/admin/:id', verifyJWT, async (req, res) => {
        //     const decodedEmail = req.decoded.email;
        //     const query = { email: decodedEmail };
        //     const user = await usersCollection.findOne(query);

        //     if (user?.role !== 'admin') {
        //         return res.status(403).send({ message: 'forbidden access' })
        //     }

        //     const id = req.params.id;
        //     const filter = { _id: ObjectId(id) }
        //     const options = { upsert: true };
        //     const updatedDoc = {
        //         $set: {
        //             role: 'admin'
        //         }
        //     }
        //     const result = await usersCollection.updateOne(filter, updatedDoc, options);
        //     res.send(result);
        // })


        //*********make an user admin end************/////
        //get product category using projection
        app.get('/productsCategory', async (req, res) => {
            const query = {};
            const result = await allProductCollection.find(query).project({ category: 1 }).toArray();
            res.send(result);
        })


        //get item category
        app.get('/items', async (req, res) => {
            const query = {};
            const item = await itemCollection.find(query).toArray();
            res.send(item)
        })

        app.post('/items', async (req, res) => {
            const item = req.body;
            const result = await itemCollection.insertOne(item);
            res.send(result)

        })


    }
    finally {

    }
}
run().catch(console.log)








app.get('/', async (req, res) => {
    res.send('fleja server is running');
})

app.listen(port, () => console.log(`Fleja running on ${port}`))