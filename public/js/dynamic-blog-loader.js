// Function to get API base URL
function getApiBaseUrl() {
    return 'http://localhost:5000';
}

// Function to get current category from URL
function getCurrentCategory() {
    const path = window.location.pathname;
    const cleanPath = path.replace(/\/index\.html$/, '');
    const category = cleanPath.split('/')[1];
    return category || 'Mental-health'; // Default category
}

// Function to get blog URL
function getBlogUrl(blog) {
    const category = blog.category.toLowerCase();
    const slug = generateSlug(blog.title);
    return `/${category}/${slug}.html`;
}

// Function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Function to generate slug
function generateSlug(title) {
    return title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
}

// Show loading overlay
function showLoading() {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center hidden';
        overlay.innerHTML = `
            <div class="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg">
                <div class="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
                <p class="mt-2 text-slate-900 dark:text-white">Loading...</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    overlay.classList.remove('hidden');
}

// Hide loading overlay
function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
}

// Handle dynamic blog post click with loading animation
async function handleBlogClick(event, blogUrl) {
    event.preventDefault();
    showLoading();

    try {
        const response = await fetch(blogUrl);
        if (!response.ok) throw new Error('Blog post not found');

        const html = await response.text();
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        // Update only the main content area
        const mainContent = tempDiv.querySelector('main') || tempDiv.querySelector('.main-content');
        if (mainContent) {
            const currentMain = document.querySelector('main') || document.querySelector('.main-content');
            if (currentMain) {
                currentMain.innerHTML = mainContent.innerHTML;
            }
        }

        // Update metadata and title
        updatePageMetadata(tempDiv);
        
        // Update URL without reload
        window.history.pushState({}, '', blogUrl);

        // Update images and other dynamic content
        updateDynamicContent();
    } catch (error) {
        console.error('Error loading blog post:', error);
        alert('Error loading blog post. Please try again.');
    } finally {
        hideLoading();
    }
}

// Function to update page metadata and title
function updatePageMetadata(newContent) {
    // Update title
    const newTitle = newContent.querySelector('title')?.textContent;
    if (newTitle) {
        document.title = newTitle;
    }

    // Update meta description
    const newDescription = newContent.querySelector('meta[name="description"]')?.getAttribute('content');
    if (newDescription) {
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.setAttribute('name', 'description');
            document.head.appendChild(metaDesc);
        }
        metaDesc.setAttribute('content', newDescription);
    }

    // Update meta image
    const newImage = newContent.querySelector('meta[property="og:image"]')?.getAttribute('content');
    if (newImage) {
        let metaImage = document.querySelector('meta[property="og:image"]');
        if (!metaImage) {
            metaImage = document.createElement('meta');
            metaImage.setAttribute('property', 'og:image');
            document.head.appendChild(metaImage);
        }
        metaImage.setAttribute('content', newImage);
    }
}

// Function to update dynamic content like images and scripts
function updateDynamicContent() {
    // Reload images
    const images = document.querySelectorAll('img[data-src]');
    images.forEach(img => {
        if (img.dataset.src) {
            img.src = img.dataset.src;
        }
    });

    // Reinitialize any custom scripts or functionality
    if (typeof initializeBlogPost === 'function') {
        initializeBlogPost();
    }
}

// Function to load blog posts dynamically
async function loadBlogPosts() {
    const category = getCurrentCategory();
    const container = document.getElementById('dynamic-posts');

    if (!container) {
        console.error('Blog posts container not found');
        return;
    }

    showLoading();

    try {
        const response = await fetch(`${getApiBaseUrl()}/api/blogs/category/${category}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const blogs = await response.json();

        if (!blogs.length) {
            container.innerHTML = `
                <div class="text-center p-8">
                    <p class="text-lg text-slate-600 dark:text-slate-400">No blog posts found.</p>
                    <a href="/" class="mt-4 inline-block text-orange-500 hover:text-orange-600">Return to Home</a>
                </div>
            `;
            return;
        }

        container.innerHTML = blogs.map(blog => createBlogCard(blog)).join('');
    } catch (error) {
        console.error('Error loading blog posts:', error);
        container.innerHTML = `
            <div class="text-center p-8">
                <p class="text-lg text-red-600 dark:text-red-400">Error loading blog posts. Please try again.</p>
                <button onclick="loadBlogPosts()" class="mt-4 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600">
                    Retry
                </button>
            </div>
        `;
    } finally {
        hideLoading();
    }
}

// Function to create a dynamic blog card
function createBlogCard(blog) {
    const blogUrl = getBlogUrl(blog);
    const formattedDate = formatDate(blog.createdAt);
    const imageUrl = blog.mainImage ? getApiBaseUrl() + blog.mainImage : '/assets/images/default-blog.jpg';

    return `
    <article class="post type-post panel vstack gap-2 ">
        <a href="${blogUrl}" onclick="handleBlogClick(event, '${blogUrl}')"
            class="position-absolute top-0 end-0 z-2 m-2 btn btn-sm btn-alt-orange w-32px h-32px rounded-circle bg-white dark:bg-slate-800" 
            title="Add to favorites">
            <i class="icon icon-narrow unicon-bookmark"></i>
        </a>
        <div class="ratio ratio-1x1 rounded uc-transition-toggle overflow-hidden">
            <img class="media-cover uc-transition-scale-up uc-transition-opaque" src="${imageUrl}" alt="${blog.title}" onerror="this.src='/assets/images/default-blog.jpg'">
            <a class="position-cover" href="${blogUrl}" onclick="handleBlogClick(event, '${blogUrl}')"></a>
        </div>
        <header class="panel vstack gap-1 px-2">
            <a class="text-orange fs-7 fw-normal text-none ft-tertiary" href="/${blog.category}/">${blog.category}</a>
            <h3 class="m-0">
                <a class="text-none" href="${blogUrl}" onclick="handleBlogClick(event, '${blogUrl}')">${blog.title}</a>
            </h3>
            <ul class="post-meta nav-x ft-tertiary justify-center gap-2 fs-7 d-none lg:d-flex">
               
                <li>
                 <div class="hstack gap-1 ft-tertiary">
                <span class="fst-italic opacity-50">By</span> <a href="#">${blog.author || 'Admin'}</a>
                 </div>
                 </li>
                <li>
                 <div class="hstack gap-1 ft-tertiary">
                <span class="fst-italic opacity-50">On</span> <span>${formattedDate}</span>
                 </div>
                 </li>
            </ul>
        </header>
    </article>`;
}

// Load blog posts when the page loads
document.addEventListener('DOMContentLoaded', loadBlogPosts);
