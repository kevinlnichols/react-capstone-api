'use strict';
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

const RatingSchema = mongoose.Schema({
    restaurant: { type: String, default: '' },
    rating: { type: Number, default: '' },
    category: { type: String, default: '' }
});

RatingSchema.methods.apiRepr = function () {
    return {
        restaurant: this.restaurant || '',
        rating: this.rating || '',
        category: this.category || ''
    };
};

const GroupSchema = mongoose.Schema({
    groupName: { type: String, default: '' },
    members: { type: Array, default: [] }
});

GroupSchema.methods.apiRepr = function () {
    return {
        groupName: this.groupName || '',
        members: this.members || ''
    };
};

const UserSchema = mongoose.Schema({
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    ratings: [RatingSchema],
    group: [GroupSchema],
    friends: { type: Array, default: [] },
});

UserSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`.trim()
});

UserSchema.methods.apiRepr = function () {
    return {
        _id: this._id,
        fullName: this.fullName || '',
        username: this.username || '',
    };
};

UserSchema.methods.validatePassword = function(password) {
    return bcrypt.compare(password, this.password);
};

UserSchema.statics.hashPassword = function(password) {
    return bcrypt.hash(password, 10);
};

const User = mongoose.model('user', UserSchema);
const Rating = mongoose.model('rating', RatingSchema);
const Group = mongoose.model('group', GroupSchema);

module.exports = {User, Rating, Group}