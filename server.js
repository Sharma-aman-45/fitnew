const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(express.json());

// Enable CORS for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Serve static files from root directory and public directory
app.use(express.static(__dirname));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now();
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Serve category directories
const categoryDirs = ['mental-health', 'wellness', 'yoga', 'nutrition', 'beejmantra'];
categoryDirs.forEach(dir => {
    app.use(`/${dir}`, express.static(path.join(__dirname, dir)));
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// Blog Schema
const blogSchema = new mongoose.Schema({
    title: String,
    heading: String,
    description: String,
    inDescriptionContent: String,
    mainImage: String,
    additionalImages: [String],
    videoUrl: String,
    links: [String],
    author: String,
    category: String,
    tags: [String],
    socialMediaLinks: {
        facebook: String,
        twitter: String,
        instagram: String,
        linkedin: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Blog = mongoose.model('Blog', blogSchema);

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Login Route
app.post('/api/login', (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Demo credentials - in production, use proper authentication
        if (username === 'admin' && password === 'admin1234') {
            const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '24h' });
            res.json({ token });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create Blog Post
app.post('/api/blogs', authenticateToken, upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'additionalImages', maxCount: 10 }
]), async (req, res) => {
    try {
        const blogData = {
            ...req.body,
            links: JSON.parse(req.body.links || '[]'),
            tags: JSON.parse(req.body.tags || '[]'),
            socialMediaLinks: JSON.parse(req.body.socialMediaLinks || '{}')
        };

        if (req.files.mainImage) {
            blogData.mainImage = '/uploads/' + req.files.mainImage[0].filename;
        }

        if (req.files.additionalImages) {
            blogData.additionalImages = req.files.additionalImages.map(file => '/uploads/' + file.filename);
        }

        const blog = new Blog(blogData);
        await blog.save();
        res.status(201).json(blog);
    } catch (error) {
        console.error('Error creating blog:', error);
        res.status(500).json({ error: 'Error creating blog post' });
    }
});

// Get All Blog Posts
app.get('/api/blogs', authenticateToken, async (req, res) => {
    try {
        const blogs = await Blog.find().sort({ createdAt: -1 });
        res.json(blogs);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching blog posts' });
    }
});

// Get Blog Posts by Category
app.get('/api/blogs/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const blogs = await Blog.find({ category })
            .sort({ createdAt: -1 })
            .select('title author category mainImage createdAt description');
            
        // Format the response
        const formattedBlogs = blogs.map(blog => ({
            ...blog.toObject(),
            createdAt: blog.createdAt.toISOString(),
            mainImage: blog.mainImage || null
        }));
        
        res.json(formattedBlogs);
    } catch (error) {
        console.error('Error fetching blogs:', error);
        res.status(500).json({ error: 'Error fetching blogs' });
    }
});

// Delete Blog Post
app.delete('/api/blogs/:id', authenticateToken, async (req, res) => {
    try {
        await Blog.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Blog post deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting blog post' });
    }
});

// Helper function to read JSON file
async function readJSONFile(filePath) {
    try {
        const data = await fs.promises.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading JSON file:', error);
        throw error;
    }
}

// Helper function for slug generation
function generateSlug(title) {
    return title.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
}

// Blog route with improved error handling
app.get('/:category/:slug.html', async (req, res) => {
    try {
        const { category, slug } = req.params;
        
        // Validate parameters
        if (!category || !slug) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        // Find the blog post
        const titleFromSlug = slug.replace(/-/g, ' ').replace(/\.html$/, '');
        const blogPost = await Blog.findOne({
            $or: [
                { title: { $regex: new RegExp(titleFromSlug, 'i') } },
                { category: category }
            ]
        });

        if (!blogPost) {
            return res.status(404).json({ 
                error: 'Blog post not found',
                category,
                slug: titleFromSlug
            });
        }

        // Read the template
        const template = fs.readFileSync(path.join(__dirname, 'templates', 'blog-post.html'), 'utf8');

        // Format the date
        const formattedDate = new Date(blogPost.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Prepare template variables
        const templateVars = {
            title: blogPost.title,
            heading: blogPost.heading || blogPost.title,
            description: blogPost.description,
            inDescriptionContent: blogPost.inDescriptionContent,
            image: blogPost.mainImage,
            content: blogPost.content,
            author: blogPost.author || 'FitMi Team',
            category: blogPost.category,
            date: formattedDate,
            keywords: (blogPost.tags || []).join(', '),
            slug: slug
        };

        // Replace template variables
        let html = template;
        Object.keys(templateVars).forEach(key => {
            const value = templateVars[key] || '';
            const regex = new RegExp(`{{${key}}}`, 'g');
            html = html.replace(regex, value);
        });

        res.send(html);
    } catch (error) {
        console.error('Error serving blog post:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message
        });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
