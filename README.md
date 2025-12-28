# Video Filter Editor

A modern, web-based video editor that allows you to upload videos, apply complex FFmpeg filters, and export high-quality segments. This tool provides a real-time preview of your filters before processing.

## Prerequisites

- **Node.js**: Ensure you have Node.js installed.
- **FFmpeg**: You should already have **FFmpeg version 6.1.1** installed on your computer and available in your system's PATH. This tool relies on FFmpeg for processing and FFplay for real-time previews.

## Getting Started

### 1. Install Dependencies

Open your terminal in the project root and run:

```bash
npm install
```

### 2. Run the Application

To start both the Vite development server and the Node.js backend, run:

```bash
npm run start
```

The application will be available at `http://localhost:5173` (or the port shown in your terminal).

## How to Use

1. **Upload Video**: Select a video file from your computer. You'll see an "Uploading..." spinner while the file is sent to the server.
2. **Preview**: Adjust filter parameters and use the **Preview** button to watch the results in real-time.
3. **Add Tasks**: Once you're happy with a filter setting and a time range, click **+ Add Task** to save it to your export queue.
4. **Export**: 
   - Click **Start Export** to process all tasks sequentially.
   - Enabling **Combine all tasks into one video** will glue all your processed segments together into a single final video after they are individualy finished.

## File Storage & Cleanup

- **Storage Location**: All processed video segments and the final merged video are stored in the `server/outputs` directory.
- **Manual Cleanup**:
  - **In-App**: Click the **Clear Storage** button at the top of the application to permanently delete all uploaded videos and exported files from the server.
  - **Manually**: You can also manually delete files from the `uploads/` and `server/outputs/` directories on your computer.

## Technologies Used

- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **Backend**: Node.js, Express, Socket.io
- **Video Engine**: FFmpeg / FFplay
