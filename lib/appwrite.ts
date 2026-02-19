import { Client, Account, ID, Databases, Storage, Avatars } from 'react-native-appwrite';

// 1. Safe Configuration Loading
const appwriteConfig = {
    endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
    projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
    databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
    userCollectionId: process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_USERS,
    outfitCollectionId: process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_OUTFITS,
    storageId: process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID,
    platform: process.env.EXPO_PUBLIC_APPWRITE_PACKAGE_NAME,
};

// 2. Debug Check (Remove this in production if you want)
// This will print to your console to prove variables are loaded
console.log("Appwrite Config Loaded:", {
    endpoint: appwriteConfig.endpoint,
    project: appwriteConfig.projectId
});

// 3. Validation
if (!appwriteConfig.endpoint || !appwriteConfig.projectId) {
    throw new Error("Appwrite Environment Variables are missing. Please check your .env file.");
}

const client = new Client();

client
    .setEndpoint(appwriteConfig.endpoint!)
    .setProject(appwriteConfig.projectId!)
    .setPlatform(appwriteConfig.platform!);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const avatars = new Avatars(client);
export { appwriteConfig };

// 4. File Upload Helper
export const uploadFile = async (fileUri: string, type: 'image' | 'video') => {
    if (!fileUri) return;

    const { mimeType, ...rest } = {
        name: fileUri.split('/').pop(),
        type: type === 'image' ? 'image/jpeg' : 'video/mp4',
        size: 0,
        uri: fileUri,
    };

    try {
        const uploadedFile = await storage.createFile(
            appwriteConfig.storageId!,
            ID.unique(),
            {
                name: rest.name!,
                type: rest.type,
                size: rest.size,
                uri: rest.uri,
            }
        );

        const fileUrl = storage.getFileView(appwriteConfig.storageId!, uploadedFile.$id);
        return fileUrl;
    } catch (error) {
        throw new Error(error as string);
    }
};