# Download Issue Troubleshooting

## Changes Made

### Frontend (`Dashboard.jsx`)
- ✅ Improved error handling to properly parse blob error responses
- ✅ Added detailed error message extraction from backend

### Backend (`documentController.js`)
- ✅ Added comprehensive logging at each step:
  - Document ID decoding
  - Document lookup
  - RBAC checks
  - Approval status verification
  - Digital signature verification
  - File reading and decryption
  - Response sending

## To Test the Fix

### Step 1: Restart Backend Server

**Stop the current backend** (Ctrl+C in backend terminal)

Then restart:
```bash
cd C:\Users\V\.gemini\antigravity\scratch\CEDMS\backend
npm start
```

### Step 2: Restart Frontend (if needed)

**Stop the current frontend** (Ctrl+C in frontend terminal)

Then restart:
```bash
cd C:\Users\V\.gemini\antigravity\scratch\CEDMS\frontend
npm run dev
```

### Step 3: Test Download

1. Login as **Manager**
2. Find an **APPROVED** document (with "✓ SIGNED" badge)
3. Click "⬇️ Download"
4. **Watch the backend terminal** for detailed logs

## Expected Logs (Success)

```
Download request received: { encodedId: '...', user: 'manager1', role: 'MANAGER' }
Decoded document ID: abc-123-...
Document found: { id: '...', filename: 'test.pdf', status: 'APPROVED' }
Verifying digital signature...
Signature verified successfully
Storage path: C:\...\uploads\xyz.enc
Reading encrypted file...
Encrypted file size: 12345
Decrypting file...
Decrypted file size: 10000
Sending file to client...
Download completed successfully
```

## Common Issues & Solutions

### Issue 1: "Document not found"
**Cause**: Invalid document ID encoding/decoding
**Solution**: Check if document ID in frontend matches backend

### Issue 2: "Document must be approved before download"
**Cause**: Document status is PENDING or REJECTED
**Solution**: Approve the document first as Manager/Admin

### Issue 3: "Digital signature verification failed"
**Cause**: Signature mismatch (data was modified)
**Solution**: Re-approve the document to generate new signature

### Issue 4: "File not found on server"
**Cause**: Encrypted file missing from uploads folder
**Solution**: Re-upload the document

### Issue 5: Decryption error
**Cause**: Encryption key mismatch or corrupted file
**Solution**: Check `backend/data/keys/server.key` exists

## Error Message Now Shows

Instead of generic "Download failed", you'll now see:
- "Document must be approved before download" (if pending)
- "Digital signature verification failed" (if signature invalid)
- "File not found on server" (if file missing)
- "Download failed: [specific error]" (with actual error message)

## Next Steps

1. Restart both servers
2. Try downloading an approved document
3. Check backend terminal for logs
4. If still failing, share the exact error message from the logs
