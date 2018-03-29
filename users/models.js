'use strict';
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

const RatingSchema = mongoose.Schema({
    rating: { type: Number, default: '' },
    categories: [{ type: String, default: '' }],
    groupId: {type: mongoose.Schema.Types.ObjectId, ref: 'Group'},
    memberId: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}
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
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: [true, 'No lead id found'] }],
  
    votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Rating', required: [true, 'No lead id found'] }],
       
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
    groups: [GroupSchema],
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: [true, 'No lead id found'] }],
   // friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: [true, 'No lead id found'] }],
});

UserSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`.trim()
});

UserSchema.methods.apiRepr = function () {
    return {
        _id: this._id,
        fullName: this.fullName || '',
        username: this.username || '',
        friends: this.friends || '',
        groups: this.groups || ''
    };
};

UserSchema.methods.validatePassword = function (password) {
    return bcrypt.compare(password, this.password);
};

UserSchema.statics.hashPassword = function (password) {
    return bcrypt.hash(password, 10);
};

const InviteSchema = mongoose.Schema({
    invited:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: [true, 'No lead id found'] }]
});

InviteSchema.methods.apiRepr = function () {
    return {
        invited: this.invited || ''
    };
};



const User = mongoose.model('User', UserSchema);
const Rating = mongoose.model('Rating', RatingSchema);
const Group = mongoose.model('Group', GroupSchema);

module.exports = { User, Rating, Group }