// 1. IMPORT POLYFILL (Must be at the very top for Hermes/React Native compatibility)
import 'web-streams-polyfill'; 

import { Client, Account, ID, Databases, Avatars } from 'react-native-appwrite';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// ==========================================
// 2. APPWRITE CONFIGURATION
// ==========================================
const appwriteConfig = {
    endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
    projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
    databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
    userCollectionId: process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_USERS,
    outfitCollectionId: process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_OUTFITS,
    memoryCollectionId: process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_MEMORIES,
    storageId: process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID, 
    platform: process.env.EXPO_PUBLIC_APPWRITE_PACKAGE_NAME,
    savedBoardsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_SAVED_BOARDS,
};

// ==========================================
// 3. CLOUDFLARE R2 CONFIGURATION (4 BUCKETS)
// ==========================================
const r2Config = {
    endpoint: process.env.EXPO_PUBLIC_R2_S3_API_URL,
    accessKeyId: process.env.EXPO_PUBLIC_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.EXPO_PUBLIC_R2_SECRET_ACCESS_KEY,
    buckets: {
        raw: {
            name: process.env.EXPO_PUBLIC_R2_BUCKET_RAW_IMAGES,
            url: process.env.EXPO_PUBLIC_R2_URL_RAW_IMAGES
        },
        wardrobe: {
            name: process.env.EXPO_PUBLIC_R2_BUCKET_WARDROBE,
            url: process.env.EXPO_PUBLIC_R2_URL_WARDROBE
        },
        styleboard: {
            name: process.env.EXPO_PUBLIC_R2_BUCKET_STYLE_BOARDS,
            url: process.env.EXPO_PUBLIC_R2_URL_STYLE_BOARDS
        },
        tryon: {
            name: process.env.EXPO_PUBLIC_R2_BUCKET_TRYON_RESULTS,
            url: process.env.EXPO_PUBLIC_R2_URL_TRYON_RESULTS
        }
    }
};

// ==========================================
// 4. INITIALIZE APPWRITE
// ==========================================
const client = new Client();
client
    .setEndpoint(appwriteConfig.endpoint!)
    .setProject(appwriteConfig.projectId!)
    .setPlatform(appwriteConfig.platform!);

export const account = new Account(client);
export const databases = new Databases(client);
export const avatars = new Avatars(client);
export { appwriteConfig };

// ==========================================
// 5. INITIALIZE CLOUDFLARE R2 (S3 CLIENT)
// ==========================================
const r2Client = new S3Client({
    region: 'auto',
    endpoint: r2Config.endpoint,
    credentials: {
        accessKeyId: r2Config.accessKeyId!,
        secretAccessKey: r2Config.secretAccessKey!,
    },
    // FIX: Required for Cloudflare R2 to format URLs correctly
    forcePathStyle: true, 
});

export type UploadDestination = 'raw' | 'wardrobe' | 'styleboard' | 'tryon';

// ==========================================
// 6. UPLOAD HELPER FUNCTION (WEB & MOBILE COMPATIBLE)
// ==========================================
export const uploadFile = async (
    fileUri: string, 
    type: 'image' | 'video', 
    destination: UploadDestination
) => {
    if (!fileUri) return;

    try {
        // Fetch the local file and get the blob
        const response = await fetch(fileUri);
        const blob = await response.blob();
        
        // Convert Blob to ArrayBuffer to bypass Hermes stream issues
        const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = reject;
            reader.readAsArrayBuffer(blob);
        });

        // FIX: Safely determine file extension (Handle Web blob: URLs vs Mobile file URLs)
        let fileExtension = type === 'image' ? 'jpg' : 'mp4';
        if (!fileUri.startsWith('blob:') && fileUri.includes('.')) {
            fileExtension = fileUri.split('.').pop() || fileExtension;
        }

        const fileName = `${ID.unique()}.${fileExtension}`;
        const fileType = type === 'image' ? 'image/jpeg' : 'video/mp4';

        const targetBucket = r2Config.buckets[destination];

        if (!targetBucket.name || !targetBucket.url) {
             throw new Error(`R2 Configuration for '${destination}' bucket is missing in .env`);
        }

        // Use Uint8Array in the Body to avoid stream getReader() errors
        const command = new PutObjectCommand({
            Bucket: targetBucket.name,
            Key: fileName,
            Body: new Uint8Array(arrayBuffer),
            ContentType: fileType,
        });

        await r2Client.send(command);

        // Return the specific public URL for the chosen bucket
        const fileUrl = `${targetBucket.url}/${fileName}`;
        return fileUrl;
        
    } catch (error) {
        console.error(`R2 Upload Error (${destination}): `, error);
        throw new Error(error as string);
    }
};