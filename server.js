const port = process.env.PORT || 8080;

const express = require('express');
const bodyParser = require('body-parser');
const hbs = require('express-hbs');

const utils = require('./utils.js');
const register = require('./users.js');
const pass = require('./passport.js');
const forum = require('./forum.js').router;
const promises = require('./promises.js');

const app = express();

app.listen(port, () => {
    console.log(`Server is up on the port ${port}`);
    utils.init();
});

app.engine('hbs', hbs.express4({
    partialsDir: __dirname + '/views/partials'
}));

app.set('view engine', 'hbs');
app.set('views', __dirname + '/views');

//hbs.registerPartials(__dirname + '/views/partials');

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({
    extended:true
}));

hbs.registerHelper('port', () => {
    return port;
});

hbs.registerHelper('year', () => {
    return new Date().getFullYear();
});

hbs.registerAsyncHelper('profileImage', (username, cb) => {
    promises.user_promise(username).then((user) => {
        cb(user.image)
    })
});


app.use(pass);
app.use(register);
app.use(forum);

// CHECKS AUTHENTICATION
checkAuthentication = (request, response, next) => {
    if (request.isAuthenticated()) {
        return next();
    }
    response.redirect('/login');
};

checkAuthentication_false = (request, response, next) => {
    if (request.isAuthenticated() != true) {
        return next();
    }
    response.redirect('/');
};

// Login Page
app.get('/login', (request, response) => {
    response.render('login.hbs', {
        title: 'Login',
        heading: 'Log In'
    });
});

// Logout Page
app.get('/logout', (request, response) => {
    request.logout();
    request.session.destroy(() => {
        response.clearCookie('connect.sid');
        response.redirect('/');
    });
});

// Register Page
app.get("/registration", checkAuthentication_false, (request, response) => {
    response.render("registration.hbs", {
        title: 'Registration',
        heading: 'Make an Account'
    });
});

// Forum page
app.get('/', async (request, response) => {
    var messages = await promises.messagePromise();
    
    response.render('forum.hbs', {
        title: 'Home',
        heading: 'Forum',
        message: messages
    });
});

// Adding new post
app.get('/new_post', checkAuthentication, (request, response) => {
    response.render('new_post.hbs', {
        title: 'Post',
        heading: 'Add a post',
    });
});

// Dynamically generated endpoint for threads
app.get('/thread/:id', async (request, response) => {
    let thread = await promises.threadPromise(request.params.id);

    let replies = await promises.replyPromise(request.params.id);

    let user = await promises.user_promise(thread.username)

    // Checks if thread owner matches current user
    let isOP = false;
    if (request.user != undefined){
        if (request.user.username == thread.username) {
            isOP = true;
        }
    }
    
    // Passes current user to render if logged in
    let curr_user;
    if (request.user != undefined) {
        curr_user = request.user.username;
    }

    response.render('thread.hbs', {
        title: thread.title,
        heading: thread.title,
        op_message: thread.message,
        poster: thread.username,
        date: thread.date,
        id: thread._id,
        reply: replies,
        isOP: isOP,
        thread: thread,
        edited_date: thread.edited_date,
        curr_user: curr_user,
        image: user.image
    });

    hbs.registerHelper('compare_user', (current, reply, options) => {
        if (current == reply) {
            return options.fn(this);
        }
        return options.inverse(this);   
    });
});

app.get("/forum/:category", async (request, response) => {
    let threads = await promises.category_promise(request.params.category);
    
    response.render("category.hbs", {
        title: `${request.params.category} Threads`,
        heading: request.params.category,
        thread: threads
    });
});

app.get("/user/:username", async (request, response) => {
    let user = await promises.user_promise(request.params.username);

    let current_user;
    if (request.user != undefined) {
        current_user = request.user.username;
    }

    response.render("profile.hbs", {
        title: `${request.params.username}'s Profile`,
        username: user.username,
        email: user.email,
        description: user.description,
        current_user: current_user,
        image: user.image
    });

    hbs.registerHelper('compare_user', (current, reply, options) => {
        if (current == reply) {
            return options.fn(this);
        }
        return options.inverse(this);   
    });
});

app.get("/user/:username/threads", async (request, response) => {
    let user_threads = await promises.user_threads_promise(request.params.username);

    response.render("user_threads.hbs", {
        title: `Threads by ${request.params.username}`,
        thread: user_threads,
        username: `${request.params.username}`
    });
})
module.exports = app;
