import express from 'express';
import fs from 'fs';
import backRouter from './backend/backendRouter.js';

const app = express();
const port = 8000;

app.use(express.json());

app.use('/api',backRouter)


// Serve static files from the 'public' folder
app.use(express.static('public'));
app.use('/images',express.static('images'));

// Serve the HTML pages from the public directory
app.use('/',express.static('public'));
app.use('/admin',express.static('public/admin.html'));



export const pathToImagesFile = "images.json";
const pathToAdminKeysFile = "adminKeys.json";
export const pathToUsersFile = "users.json";
export const pathToEventImages = "public/img/eventImages/";
export const pathToLogFile = "logs.json";

const lifeTimeForAdminKeys = 10 * 24 * 60 * 60 * 1000; // 10 days in milliseconds

// LOG SYSTEM

export function logEvent(eventData) {
    const currentDate = new Date().toISOString();
    eventData.date = currentDate;
    
    // Read existing events from file, or create an empty array if the file doesn't exist
    let events = [];
    if (fs.existsSync(pathToLogFile)) {
        events = JSON.parse(fs.readFileSync(pathToLogFile, 'utf8'));
    }

    // Add the new event to the array
    events.push(eventData);

    // Write the updated events array back to the file
    fs.writeFileSync(pathToLogFile, JSON.stringify(events, null, 2));
}

export function userHasPermission(adminKey, accountType) {
    const userAccountType = getAccountTypeFromAdminKey(adminKey);
    
    if (Array.isArray(accountType)) {
        // If accountType is an array, check if the user's account type matches any of the account types in the array
        return accountType.includes(userAccountType);
    } else {
        // If accountType is a string, check if the user's account type matches the specified account type
        return userAccountType === accountType;
    }
}



// LOGIN SYSTEM
app.post('/login', (req, res) => {
    const username = req.body.username; // Extract username from request body
    const password = req.body.password; // Extract password from request body

    let userCredentials = fs.readFileSync(pathToUsersFile, 'utf8');
    userCredentials = JSON.parse(userCredentials); // Parse the JSON string into an object

    const userId = userCredentials.find(user => user.username === username && user.password === password).id;

    if (credentialsIsValid(username, password)) {
        let adminKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        saveAdminKey(adminKey, userId);
        res.status(200).json({ adminKey }); // Send the content back to the client
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

app.post('/testAdminKey', (req, res) => {
    const adminKey = req.body.adminKey; // Extract admin key from request body

    if (isAdminKeyValid(adminKey)) {
        res.status(200).json("Adminkey is valid");
        return;
    }
    res.status(401).json("Adminkey is not valid");
});

function credentialsIsValid(username, pass) {
    let userCredentials = fs.readFileSync(pathToUsersFile, 'utf8');
    userCredentials = JSON.parse(userCredentials); // Parse the JSON string into an object

    for (const user of userCredentials) {
        if (user.username === username && user.password === pass) {
            return true;
        }
    }
    return false;
}

function getUserFromAdminKey(adminKey) {
    const validAdminKeys = JSON.parse(fs.readFileSync(pathToAdminKeysFile, 'utf8'));
    // Find the admin key in the adminKeys array
    const adminKeyData = validAdminKeys.find(keyData => keyData.key === adminKey);
    if (!adminKeyData) {
        return null; // Admin key not found
    }

    // Find the user with the same username as the admin key
    let userCredentials = fs.readFileSync(pathToUsersFile, 'utf8');
    userCredentials = JSON.parse(userCredentials); // Parse the JSON string into an object
    const user = userCredentials.find(user => user.id === adminKeyData.id);

    // console.log(adminKey)
    // console.log(user);

    return user;
}   

export function getUsernameFromAdminKey(adminKey) {
    const user = getUserFromAdminKey(adminKey);
    return user.username;
}

export function getAccountTypeFromAdminKey(adminKey) {
    const user= getUserFromAdminKey(adminKey)
    return user.accountType;
}

export function getUserIdFromAdminKey(adminKey) {
    const user = getUserFromAdminKey(adminKey);
    return user.id;
}

function saveAdminKey(adminKey, id) {
    const currentDate = new Date().toISOString();
    const adminKeyData = { key: adminKey, id: id, date: currentDate };

    // Read existing admin keys from file, or create an empty array if the file doesn't exist
    let adminKeys = [];
    if (fs.existsSync(pathToAdminKeysFile)) {
        adminKeys = JSON.parse(fs.readFileSync(pathToAdminKeysFile, 'utf8'));
    }

    // Add the new admin key data to the array
    adminKeys.push(adminKeyData);

    // Write the updated admin keys array back to the file
    fs.writeFileSync(pathToAdminKeysFile, JSON.stringify(adminKeys, null, 2));
  }

export function isAdminKeyValid(adminKey) {
    const currentDate = new Date();
    const validAdminKeys = JSON.parse(fs.readFileSync(pathToAdminKeysFile, 'utf8'));
    // Find the admin key in the adminKeys array
    const adminKeyData = validAdminKeys.find(keyData => keyData.key === adminKey);
    if (!adminKeyData) {
        return false; // Admin key not found
    }

    // Parse the saved date and compare it with ten days ago
    const savedDate = new Date(adminKeyData.date);
    const validTimeForAdminKey = new Date(currentDate - lifeTimeForAdminKeys);

    return savedDate >= validTimeForAdminKey;
}






app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
