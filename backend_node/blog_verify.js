const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '.env') });

const { Blog } = require('./src/models');
const blogService = require('./src/services/blog.service');

async function runVerify() {
    console.log('Connecting to MongoDB...');
    const mongoUri = process.env.MONGO_URL + (process.env.DB_NAME || '');
    await mongoose.connect(mongoUri);
    console.log('Connected.');

    try {
        const tenantId = 1;
        
        // 1. Create a test post
        console.log('--- Step 1: Create Blog Post ---');
        const postData = {
            title: 'Test Journal Entry',
            slug: 'test-journal-entry-' + Date.now(),
            content: 'Testing blog updates',
            status: 'draft'
        };

        const post = await blogService.createPost(postData, tenantId);
        console.log('Post created:', post.id);

        // 2. Update the post
        console.log('\n--- Step 2: Update Blog Post ---');
        const updateData = {
            title: 'Updated Journal Entry',
            content: 'Updated content'
        };

        const updatedPost = await blogService.updatePost(post.id, updateData, tenantId);
        console.log('Post updated title:', updatedPost.title);

        if (updatedPost.title !== 'Updated Journal Entry') {
            throw new Error('Blog update failed');
        }

        // Cleanup
        await Blog.findByIdAndDelete(post.id);
        console.log('Test post deleted.');

        console.log('\n--- Journal Verification SUCCESS ---');

    } catch (error) {
        console.error('\n--- Journal Verification FAILED ---');
        console.error(error);
    } finally {
        await mongoose.connection.close();
    }
}

runVerify();
