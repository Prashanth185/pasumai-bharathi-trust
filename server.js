const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5501;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        cb(null, `donation_${timestamp}_${randomString}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, GIF, and PDF files are allowed'));
        }
    }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'pasumai-bharathi-secret-key-123',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using https
}));

// Database Setup
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        db.run(`CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            message TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS donations_80g (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fullName TEXT NOT NULL,
            email TEXT NOT NULL,
            mobile TEXT NOT NULL,
            panCard TEXT NOT NULL,
            address TEXT NOT NULL,
            donationAmount TEXT NOT NULL,
            transactionId TEXT NOT NULL,
            paymentMethod TEXT NOT NULL,
            form_source TEXT DEFAULT 'quick_payment',
            paymentScreenshot TEXT,
            verificationStatus TEXT DEFAULT 'pending',
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.all(`PRAGMA table_info(donations_80g)`, [], (pragmaErr, columns) => {
            if (pragmaErr) {
                console.error('Error checking donations_80g schema:', pragmaErr.message);
                return;
            }

            const hasPurpose = columns.some(column => column.name === 'purpose');
            const hasFormSource = columns.some(column => column.name === 'form_source');

            if (hasPurpose) {
                const formSourceSelect = hasFormSource ? 'form_source' : `'quick_payment'`;
                db.serialize(() => {
                    db.run(`DROP TABLE IF EXISTS donations_80g_clean`);
                    db.run(`CREATE TABLE IF NOT EXISTS donations_80g_clean (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        fullName TEXT NOT NULL,
                        email TEXT NOT NULL,
                        mobile TEXT NOT NULL,
                        panCard TEXT NOT NULL,
                        address TEXT NOT NULL,
                        donationAmount TEXT NOT NULL,
                        transactionId TEXT NOT NULL,
                        paymentMethod TEXT NOT NULL,
                        form_source TEXT DEFAULT 'quick_payment',
                        paymentScreenshot TEXT,
                        verificationStatus TEXT DEFAULT 'pending',
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                    )`);
                    db.run(`INSERT INTO donations_80g_clean (
                        id, fullName, email, mobile, panCard, address, donationAmount,
                        transactionId, paymentMethod, form_source, paymentScreenshot,
                        verificationStatus, timestamp
                    )
                    SELECT id, fullName, email, mobile, panCard, address, donationAmount,
                        transactionId, paymentMethod, ${formSourceSelect}, paymentScreenshot,
                        verificationStatus, timestamp
                    FROM donations_80g`);
                    db.run(`DROP TABLE donations_80g`);
                    db.run(`ALTER TABLE donations_80g_clean RENAME TO donations_80g`);
                });
                return;
            }

            if (!hasFormSource) {
                db.run(`ALTER TABLE donations_80g ADD COLUMN form_source TEXT DEFAULT 'quick_payment'`, (alterErr) => {
                    if (alterErr) {
                        console.error('Error adding form_source column:', alterErr.message);
                        return;
                    }

                    db.run(`
                        UPDATE donations_80g
                        SET form_source = CASE
                            WHEN paymentMethod IN ('Bank Transfer', 'Cheque / Demand Draft', 'Cheque', 'Demand Draft') THEN 'bank_transfer'
                            WHEN paymentMethod = 'UPI' AND (
                                donationAmount LIKE '%200' OR
                                donationAmount LIKE '%500' OR
                                donationAmount LIKE '%1000' OR
                                donationAmount LIKE '%5000'
                            ) THEN 'impact_contribution'
                            ELSE 'quick_payment'
                        END
                    `);
                });
            }
        });

        console.log('Database initialized.');
    }
});

// Admin Credentials (Hardcoded for demo)
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

// Auth Middleware
const isAuthenticated = (req, res, next) => {
    if (req.session.loggedIn) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
};

// Submit Contact Message
app.post('/api/contact', (req, res) => {
    const { name, email, phone, message } = req.body;
    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Name, email, and message are required.' });
    }

    const stmt = db.prepare(`INSERT INTO messages (name, email, phone, message) VALUES (?, ?, ?, ?)`);
    stmt.run([name, email, phone || '', message], function(err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true, message: 'Message sent successfully!', id: this.lastID });
    });
    stmt.finalize();
});

// Submit 80G Donation Request
app.post('/api/donation-80g', upload.single('paymentScreenshot'), (req, res) => {
    try {
        const { fullName, email, mobile, panCard, address, donationAmount, transactionId, paymentMethod } = req.body;
        const formSource = req.body.form_source || 'quick_payment';

        // Validation
        if (!fullName || !email || !mobile || !panCard || !address || !donationAmount || !transactionId || !paymentMethod) {
            return res.status(400).json({ error: 'All required fields must be filled.' });
        }

        if (!['impact_contribution', 'quick_payment', 'bank_transfer'].includes(formSource)) {
            return res.status(400).json({ error: 'Invalid form source.' });
        }

        if (!/^\d+$/.test(String(donationAmount)) || Number(donationAmount) <= 0) {
            return res.status(400).json({ error: 'Donation amount must be a valid number.' });
        }

        // Validate PAN format
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panCard)) {
            return res.status(400).json({ error: 'Invalid PAN format.' });
        }

        // Validate mobile
        if (!/^\d{10}$/.test(mobile)) {
            return res.status(400).json({ error: 'Invalid mobile number.' });
        }

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email address.' });
        }

        const screenshotPath = req.file ? req.file.filename : null;

        const stmt = db.prepare(`
            INSERT INTO donations_80g (fullName, email, mobile, panCard, address, donationAmount, transactionId, paymentMethod, form_source, paymentScreenshot)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run([fullName, email, mobile, panCard, address, donationAmount, transactionId, paymentMethod, formSource, screenshotPath], function(err) {
            if (err) {
                console.error(err);
                // Delete uploaded file if database insert fails
                if (req.file) {
                    fs.unlink(path.join(uploadsDir, screenshotPath), (err) => {
                        if (err) console.error('Error deleting file:', err);
                    });
                }
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true, message: 'Your 80G certificate request has been submitted successfully!', id: this.lastID });
        });

        stmt.finalize();
    } catch (err) {
        console.error('Error in 80G submission:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get 80G Donations (Admin Only)
app.get('/api/donations-80g', isAuthenticated, (req, res) => {
    const { source } = req.query;
    const allowedSources = ['impact_contribution', 'quick_payment', 'bank_transfer'];
    const hasSourceFilter = allowedSources.includes(source);
    const sql = hasSourceFilter
        ? `SELECT * FROM donations_80g WHERE form_source = ? ORDER BY timestamp DESC`
        : `SELECT * FROM donations_80g ORDER BY timestamp DESC`;
    const params = hasSourceFilter ? [source] : [];

    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

// Update 80G Donation Status (Admin Only)
app.put('/api/donations-80g/:id', isAuthenticated, (req, res) => {
    const { id } = req.params;
    const { verificationStatus } = req.body;

    if (!['pending', 'verified', 'rejected'].includes(verificationStatus)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    db.run(`UPDATE donations_80g SET verificationStatus = ? WHERE id = ?`, [verificationStatus, id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true, message: 'Status updated successfully' });
    });
});

// Delete 80G Donation (Admin Only)
app.delete('/api/donations-80g/:id', isAuthenticated, (req, res) => {
    const { id } = req.params;

    // First get the record to find the file
    db.get(`SELECT paymentScreenshot FROM donations_80g WHERE id = ?`, [id], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ error: 'Record not found' });
        }

        // Delete file
        if (row.paymentScreenshot) {
            fs.unlink(path.join(uploadsDir, row.paymentScreenshot), (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }

        // Delete database record
        db.run(`DELETE FROM donations_80g WHERE id = ?`, id, function(err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true, message: 'Record deleted successfully' });
        });
    });
});

// Admin Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        req.session.loggedIn = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Admin Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Get Messages (Admin Only)
app.get('/api/messages', isAuthenticated, (req, res) => {
    db.all(`SELECT * FROM messages ORDER BY timestamp DESC`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

// Delete Message (Admin Only)
app.delete('/api/messages/:id', isAuthenticated, (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM messages WHERE id = ?`, id, function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true, deleted: this.changes });
    });
});

// Directory listing for gallery-loader.js
app.use((req, res, next) => {
    if (req.path.endsWith('/images/') || req.path.endsWith('/videos/')) {
        const dirPath = path.join(__dirname, req.path);
        fs.readdir(dirPath, (err, files) => {
            if (err) return next();
            let html = '<html><body>';
            files.forEach(file => {
                html += `<a href="${file}">${file}</a><br>`;
            });
            html += '</body></html>';
            res.send(html);
        });
    } else {
        next();
    }
});

// Fix nested workspace routing for local file paths like /pasumai-bharathi-trust/pasumai-bharathi-trust/
app.use((req, res, next) => {
    const prefix = '/pasumai-bharathi-trust/pasumai-bharathi-trust';
    if (req.path.startsWith(prefix)) {
        req.url = req.url.replace(prefix, '');
    }
    next();
});

// Static Files
app.use(express.static(__dirname));
app.use('/uploads', express.static(uploadsDir));

// Custom Admin Routes
app.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-login.html'));
});

app.get('/admin/dashboard', (req, res) => {
    // Basic check before serving the page, though API is protected anyway
    if (!req.session.loggedIn) {
        return res.redirect('/admin/login');
    }
    res.sendFile(path.join(__dirname, 'admin-dashboard.html'));
});

// Catch-all to redirect to index
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
