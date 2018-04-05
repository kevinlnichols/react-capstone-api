const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const { app, runServer, closeServer } = require('../server');
const { TEST_DATABASE_URL } = require('../config');
const { User, Rating } = require('../users/models');

const should = chai.should();
chai.use(chaiHttp);

describe('API', function () {

    it('should 200 on GET requests', function () {
        return chai.request(app)
            .get('/api/fooooo')
            .then(function (res) {
                res.should.have.status(200);
                res.should.be.json;
            });
    });
});

function tearDownDb() {
    return new Promise((resolve, reject) => {
        console.warn('Deleting database');
        mongoose.connection.dropDatabase()
            .then(result => resolve(result))
            .catch(err => reject(err));
    });
}

function seedUserData() {
    console.info('seeding user data');
    var seedData = [];
    for (let i = 1; i <= 10; i++) {
        seedData.push({
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            username: faker.internet.userName(),
            password: faker.lorem.words(),
        });
    }
    return User.insertMany(seedData);
}

describe('user API resource', function () {
    before(function () {
        return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function () {
        return seedUserData();
    });

    afterEach(function () {
        return tearDownDb();
    });

    after(function () {
        return closeServer();
    });

    describe('GET endpoint', function () {
        it('should return all existing users', function () {
            let res;
            return chai.request(app)
                .get('/myusers')
                .then(_res => {
                    res = _res;
                    res.should.have.status(200);
                    res.body.length.should.be.above(0);
                    return User.count();
                })
                .then(count => {
                    res.body.length.should.be.equal(count);
                });
        });
    });

    describe('POST endpoint', function () {
        it('should add a new user', function () {
            const newUser = {
                firstName: faker.name.firstName(),
                lastName: faker.name.lastName(),
                username: faker.internet.userName(),
                password: faker.lorem.words()
            };
            console.log(newUser);
            return chai.request(app)
                .post('/')
                .send(newUser)
                .then(function (res) {
                    console.log(res.body);
                    res.should.have.status(201);
                    res.should.have.json;
                    res.body.should.be.a('object');
                    res.body.should.include.keys('_id', 'username');
                    res.body._id.should.not.be.null;
                    res.body.username.should.equal(newUser.username);
                    return User.findById(res.body._id);
                })
        });
    });

    describe('PUT endpoint', function () {
        it('should create group', function () {
            const createGroup = {
                groupId: 'hi',
                groupName: 'hello',
                members: [],
                votes: []
            };
            return User
                .findOne()
                .then(user => {
                    createGroup.groupId = groups._id;
                    return chai.request(app)
                        .put('/group/create')
                        .send(createGroup);
                })
                .then(res => {
                    res.should.have.status(204);
                    return User.findById(createGroup.groupId);
                })
        });
    });
});
