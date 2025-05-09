import { Router } from 'express';
const router = Router();
import bcrypt from 'bcrypt';
import * as userdata from '../data/user.js';
import middleware from '../middleware.js';
import Validation from '../helpers.js'
import xss from 'xss';

router.route('/signup')
    .get(middleware.signupRouteMiddleware, async(req, res) => {
        res.render('signup', { title: 'Sign Up' });
    })
    .post(async(req, res) => {
        const formData = req.body;

        console.log('Signup Form Data:', formData);

        let { userName, firstName, lastName, email, password, bio, gender, city, state, dob, courses, education, terms, privacy } = req.body;

        try {
            const existingUsername = await userdata.findUserByUsername(userName);
            if (existingUsername) {
                return res.render('signup', { title: 'Sign Up', error: 'Username already exists.' });
            }
            const existingemail = await userdata.findUserByEmail(email);
            if (existingemail) {
                return res.render('signup', { title: 'Sign Up', error: 'Email already registered.' });
            }

            if (!userName ||
                !firstName ||
                !lastName ||
                !email ||
                !password ||
                !terms ||
                !privacy
            )
                throw 'basic info fields need to have valid values';
            userName = Validation.checkString(userName, "Validate username").toLowerCase();
            firstName = Validation.checkString(firstName, "Validate firstName").toLowerCase();
            lastName = Validation.checkString(lastName, "Validate lastName").toLowerCase();
            email = Validation.checkEmail(email).toLowerCase();
            password = Validation.checkPassword(password, "password");

            courses = courses != '' ? courses.split(',').map(element => element.trim()) : null;
            bio = bio ? Validation.checkString(bio, "bio") : '';
            gender = gender ? Validation.checkGender(gender, "gender") : '';
            city = city ? Validation.checkString(city, "city") : '';
            state = state ? Validation.checkString(state, "state") : '';
            dob = dob ? Validation.checkDate(dob, 1) : '';
            courses = courses ? Validation.checkStringArray(courses) : [];
            education = education ? Validation.checkEducation(education) : [];
            if (terms != 'on' || privacy != 'on') throw 'privacy and term must be agreed'


            const hashedPassword = await bcrypt.hash(password, 10);
            let newUser = await userdata.createUser(userName, firstName, lastName, email, hashedPassword, bio, gender, city, state, dob, courses, education, terms, privacy);
            if (newUser) {
                req.session.user = {
                    id: newUser._id,
                    userName: newUser.userName,
                    firstName: newUser.firstName,
                    lastName: newUser.lastName,
                    role: newUser.role
                };
                res.redirect('/profile');

            } else {
                throw "Error: Failt to signup using createUser"
            }

        } catch (error) {
            console.error('Error during signup:', error);
            res.render('signup', { title: 'Sign Up', error: error });
        }
    });
router.route('/login')
    .get(middleware.loginRouteMiddleware, async(req, res) => {
        res.render('login', { title: 'Login' });
    })
    .post(async(req, res) => {
        var { userName, password } = req.body;

        try {
            userName = Validation.checkUserName(userName);
            password = Validation.checkString(password);

            let finduser = await userdata.checkLogin(userName, password);
            if (!finduser) throw "No user find"
            req.session.user = {
                id: finduser._id,
                userName: finduser.userName,
                firstName: finduser.firstName,
                lastName: finduser.lastName,
                role: finduser.role
            };
            switch (finduser.role) {
                case 'user':
                    res.redirect('/profile');
                    break;
                case 'business':
                    res.redirect('/profile/business');
                    break;
                case 'admin':
                    res.redirect('/admin/admin-table');
                    break;
            }


        } catch (error) {
            console.error('Error during login:', error);
            res.render('login', { title: 'Login', error: error });
        }
    });

router.route('/logout')
    .get(middleware.signoutRouteMiddleware, async(req, res) => {
        req.session.destroy(() => {
            res.redirect('/auth/login');
        })
    });

router.delete('/:id', async(req, res) => {
    try {
        var userId = req.params.id;
        userId = Validation.checkId(userId);
        var user = await userdata.findUserById(userId);
        if (!user) {
            res.status(404).json({ message: 'No user find' });
        }
        var result = await userdata.removeUser(userId);
        if (result) {
            res.status(200).json({ message: 'User deleted successfully' });
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: error });
    }
});

router.patch('/add-badge', async(req, res) => {
    try {
        var { userName, userId, badges } = req.body;
        try {
            badges = Validation.checkStringArray(badges, "badges");
        } catch (e) {
            return res.status(400).json({ error: e });
        }
        var user = null;

        // Handle cases in a defined priority order
        if (userName) {
            user = await userdata.findUserByUsername(userName);
        } else if (userId) {
            user = await userdata.findUserById(userId);
        }

        if (!user) {
            return res.status(404).json({ message: 'No user found' });
        }

        var result = await userdata.addBadge(user.userName, badges);
        if (result) {
            return res.status(200).json(result);
        }
    } catch (error) {
        console.error('Error adding badges:', error);
        return res.status(500).json({ message: error.toString() });
    }
});

export default router;