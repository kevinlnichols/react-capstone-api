const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { User, Rating } = require('./models');
const passport = require('passport');
const jwtAuth = passport.authenticate('jwt', { session: false });

const router = express.Router();

const jsonParser = bodyParser.json();

router.post('/', jsonParser, (req, res) => {
    const requiredFields = ['username', 'password'];
    const missingField = requiredFields.find(field => !(field in req.body));

    if (missingField) {
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: 'Missing field',
            location: missingField
        });
    }

    const stringFields = ['username', 'password', 'firstName', 'lastName'];
    const nonStringField = stringFields.find(
        field => field in req.body && typeof req.body[field] !== 'string'
    );

    if (nonStringField) {
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: 'Incorrect field type: expected string',
            location: nonStringField
        });
    }

    // If the username and password aren't trimmed we give an error.  Users might
    // expect that these will work without trimming (i.e. they want the password
    // "foobar ", including the space at the end).  We need to reject such values
    // explicitly so the users know what's happening, rather than silently
    // trimming them and expecting the user to understand.
    // We'll silently trim the other fields, because they aren't credentials used
    // to log in, so it's less of a problem.
    const explicityTrimmedFields = ['username', 'password'];
    const nonTrimmedField = explicityTrimmedFields.find(
        field => req.body[field].trim() !== req.body[field]
    );

    if (nonTrimmedField) {
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: 'Cannot start or end with whitespace',
            location: nonTrimmedField
        });
    }

    const sizedFields = {
        username: {
            min: 1
        },
        password: {
            min: 10,
            // bcrypt truncates after 72 characters, so let's not give the illusion
            // of security by storing extra (unused) info
            max: 72
        }
    };
    const tooSmallField = Object.keys(sizedFields).find(
        field =>
            'min' in sizedFields[field] &&
            req.body[field].trim().length < sizedFields[field].min
    );
    const tooLargeField = Object.keys(sizedFields).find(
        field =>
            'max' in sizedFields[field] &&
            req.body[field].trim().length > sizedFields[field].max
    );

    if (tooSmallField || tooLargeField) {
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: tooSmallField
                ? `Must be at least ${sizedFields[tooSmallField]
                    .min} characters long`
                : `Must be at most ${sizedFields[tooLargeField]
                    .max} characters long`,
            location: tooSmallField || tooLargeField
        });
    }

    let { username, password, firstName = '', lastName = '' } = req.body;
    // Username and password come in pre-trimmed, otherwise we throw an error
    // before this
    firstName = firstName.trim();
    lastName = lastName.trim();

    return User.find({ username })
        .count()
        .then(count => {
            if (count > 0) {
                // There is an existing user with the same username
                return Promise.reject({
                    code: 422,
                    reason: 'ValidationError',
                    message: 'Username already taken',
                    location: 'username'
                });
            }
            // If there is no existing user, hash the password
            return User.hashPassword(password);
        })
        .then(hash => {
            return User.create({
                username,
                password: hash,
                firstName,
                lastName
            });
        })
        .then(user => {
            return res.status(201).json(user.serialize());
        })
        .catch(err => {
            // Forward validation errors on to the client, otherwise give a 500
            // error because something unexpected has happened
            if (err.reason === 'ValidationError') {
                return res.status(err.code).json(err);
            }
            res.status(500).json({ code: 500, message: 'Internal server error4' });
        });
});

// Never expose all your users like below in a prod application
// we're just doing this so we have a quick way to see
// if we're creating users. keep in mind, you can also
// verify this in the Mongo shell.
router.get('/', (req, res) => {
    return User.find()
        .then(users => res.json(users.map(user => user.apiRepr())))
        .catch(err => {
            res.status(500).json({ message: 'Internal server error3', err })
        });
});

router.put('/group/create', jsonParser, jwtAuth, (req, res) => {
    User.findByIdAndUpdate(req.user._id, {
        $addToSet: { groups: req.body }
    }).then(member => {
        return res.status(204).end();
    }).catch(err => {
        return res.status(500).json({
            message: 'Internal Server Erroor'
        });
    });
})

router.put('/:id', jsonParser, jwtAuth, (req, res) => {
    User.findByIdAndUpdate(req.user._id, {
        $addToSet: { friends: req.params.id }
    }).then(friend => {
        return res.status(204).end();
    }).catch(err => {
        return res.status(500).json({
            message: 'Internal Server Error1'
        });
    });
})

router.get('/myusers', jwtAuth, (req, res) => {
    return User.findOne({ _id: req.user._id, })
        .populate('friends', '_id firstName lastName')
        .then(user => res.json(user.friends))
        .catch(err => {
            res.status(500).json({ message: 'Internal server error2', err })
        });
});

router.get('/groups/view', (req, res) => {
    return User.find()
        .then(users => res.json(users.map(user => user.apiRepr())))
        .catch(err => {
            res.status(500).json({ message: 'Internal server error3', err })
        });
});

router.get('/group', jwtAuth, (req, res) => {
    const find = { $or: [{ _id: req.user._id }, { 'groups.members': req.user._id }] };
    return User.find(find)
        .populate('groups.members')
        .populate('groups.votes')
        .then(users => {
            let groups = [];
            users.forEach(user => {
                if (user._id == req.user._id) {
                    if (user.groups) {
                        groups = groups.concat(user.groups);
                    }
                } else {
                    const groupsFound = user.groups.find(g => {
                        return g.members.find(member => member._id == req.user._id)
                    })
                    if (groupsFound) {
                        groups = groups.concat(groupsFound);
                    }
                }
            })
            res.json(groups)
        })
        .catch(err => {
            res.status(500).json({ message: 'Internal server error', err })
        });
});

router.get('/rating', jwtAuth, (req, res) => {
    return Rating.find({ 'groupId': req.params.id})
        .populate('ratings._id')
        .populate('ratings.memberid')
        .populate('ratings.categories')
        .then(users => {
            console.log('acutally ratings', users);
            let groups = [];
            users.forEach(user => {
                if (user._id == req.user._id) {
                    if (user.groups) {
                        groups = groups.concat(user.groups);
                    }
                } else {
                    const groupsFound = user.groups.find(g => {
                        return g.members.find(member => member._id == req.user._id)
                    })
                    if (groupsFound) {
                        groups = groups.concat(groupsFound);
                    }
                }
            })
            res.json(groups)
        })
        .catch(err => {
            res.status(500).json({ message: 'Internal server error', err })
        });
});

router.delete('/group/:id', jwtAuth, (req, res) => {
    return User.findOneAndUpdate(
        { 'groups._id': req.params.id }, 
        { $pull: { groups: { _id: req.params.id } } })
        .then(count => {
            res.status(204).end();
        })
        .catch(err => {
            res.status(500).json({ message: 'Internal server error haha', err })
            console.log(err);
        });;
});

router.delete('/friends/:id', jwtAuth, (req, res) => {
    return User.findOneAndUpdate({ '_id': req.user._id }, { $pull: { friends: req.params.id  } })
        .then(count => {
            res.status(204).end();
        })
        .catch(err => {
            res.status(500).json({ message: 'Internal server error haha', err })
            console.log(err);
        });;
});

router.post('/vote/:id', jwtAuth, jsonParser, (req, res) => {
    let ratingObject;
    return Rating.findOneAndUpdate({ 'groupId': req.params.id, 'memberId': req.user._id },
        {
            $set: {
                groupId: req.params.id,
                memberId: req.user._id,
                categories: req.body
            }
        }, {
            upsert: true,
            new: true
        })
        .then(rating => {
            ratingObject = rating;
            return User.findOneAndUpdate({'groups._id': req.params.id}, {$addToSet: {'groups.$.votes': ratingObject._id}})
        })
        .then(rating => res.json(ratingObject.categories))
        .catch(err => {
            console.log(err);
            if (err.reason === 'ValidationError') {
                return res.status(err.code).json(err);
            }
            res.status(500).json({ code: 500, message: 'Internal server error heyo' });
        });
});

module.exports = { router };