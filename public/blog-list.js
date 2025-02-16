const API_URL = 'http://localhost:5000/api';
let currentCategory = '';
let currentPage = 1;
const postsPerPage = 6;

// Initialize the page
async function initializePage() {
    await loadCategories();
    await loadTags();
    await loadBlogPosts();
    setupSearch();
}

// Load categories and create navigation
async function loadCategories() {
    try {
        const response = await fetch(`${API_URL}/categories`);
        const categories = await response.json();
        
        const categoryNav = document.getElementById('categoryNav');
        if (categoryNav) {
            categoryNav.innerHTML = `
                <li class="nav-item">
                    <a class="nav-link active" href="#" data-category="">All Posts</a>
                </li>
                ${categories.map(cat => `
                    <li class="nav-item">
                        <a class="nav-link" href="#" data-category="${cat._id}">
                            ${formatCategory(cat._id)} (${cat.count})
                        </a>
                    </li>
                `).join('')}
            `;

            // Add event listeners to category links
            categoryNav.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    currentCategory = e.target.dataset.category;
                    currentPage = 1;
                    // Update active state
                    categoryNav.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                    e.target.classList.add('active');
                    loadBlogPosts();
                });
            });
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Load tags
async function loadTags() {
    try {
        const response = await fetch(`${API_URL}/tags`);
        const tags = await response.json();
        
        const tagContainer = document.getElementById('tagCloud');
        if (tagContainer) {
            tagContainer.innerHTML = tags.map(tag => `
                <a href="#" class="tag-link" data-tag="${tag}">${tag}</a>
            `).join('');

            // Add event listeners to tags
            tagContainer.querySelectorAll('.tag-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const searchInput = document.getElementById('searchInput');
                    searchInput.value = e.target.dataset.tag;
                    searchPosts(e.target.dataset.tag);
                });
            });
        }
    } catch (error) {
        console.error('Error loading tags:', error);
    }
}

// Load blog posts
async function loadBlogPosts() {
    try {
        const url = currentCategory 
            ? `${API_URL}/blogs/category/${currentCategory}`
            : `${API_URL}/blogs`;
            
        const response = await fetch(url);
        const blogs = await response.json();
        
        displayBlogPosts(blogs);
    } catch (error) {
        console.error('Error loading blog posts:', error);
    }
}

// Search posts
async function searchPosts(query) {
    if (!query.trim()) {
        currentCategory = '';
        loadBlogPosts();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/blogs/search?query=${encodeURIComponent(query)}`);
        const blogs = await response.json();
        displayBlogPosts(blogs);
    } catch (error) {
        console.error('Error searching posts:', error);
    }
}

// Setup search functionality
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    let debounceTimer;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            searchPosts(e.target.value);
        }, 300);
    });
}

// Display blog posts
function displayBlogPosts(blogs) {
    const container = document.getElementById('blogPosts');
    const totalPages = Math.ceil(blogs.length / postsPerPage);
    const start = (currentPage - 1) * postsPerPage;
    const paginatedBlogs = blogs.slice(start, start + postsPerPage);
    
    if (container) {
        container.innerHTML = paginatedBlogs.length > 0 ? paginatedBlogs.map(blog => `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="card h-100">
                    ${blog.mainImage ? `
                        <img src="${blog.mainImage}" class="card-img-top" alt="${blog.title}" 
                            style="height: 200px; object-fit: cover;">
                    ` : ''}
                    <div class="card-body">
                        <div class="mb-2">
                            <span class="badge bg-primary">${formatCategory(blog.category)}</span>
                            ${blog.tags.map(tag => `
                                <span class="badge bg-secondary">${tag}</span>
                            `).join('')}
                        </div>
                        <h5 class="card-title">${blog.title}</h5>
                        <h6 class="card-subtitle mb-2 text-muted">By ${blog.author}</h6>
                        <p class="card-text">${blog.description.substring(0, 150)}...</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">${formatDate(blog.createdAt)}</small>
                            <a href="/blog-details.html?id=${blog._id}" class="btn btn-primary btn-sm">Read More</a>
                        </div>
                    </div>
                </div>
            </div>
        `).join('') : '<div class="col-12"><p class="text-center">No posts found</p></div>';

        // Display pagination
        displayPagination(totalPages);
    }
}

// Display pagination
function displayPagination(totalPages) {
    const paginationContainer = document.getElementById('pagination');
    if (paginationContainer && totalPages > 1) {
        let paginationHTML = '<ul class="pagination justify-content-center">';
        
        // Previous button
        paginationHTML += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage - 1}">Previous</a>
            </li>
        `;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            paginationHTML += `
                <li class="page-item ${currentPage === i ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }

        // Next button
        paginationHTML += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage + 1}">Next</a>
            </li>
        `;

        paginationHTML += '</ul>';
        paginationContainer.innerHTML = paginationHTML;

        // Add event listeners to pagination links
        paginationContainer.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const newPage = parseInt(e.target.dataset.page);
                if (newPage && newPage !== currentPage && newPage > 0 && newPage <= totalPages) {
                    currentPage = newPage;
                    loadBlogPosts();
                }
            });
        });
    } else {
        paginationContainer.innerHTML = '';
    }
}

// Helper function to format category names
function formatCategory(category) {
    return category
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Helper function to format dates
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage);
