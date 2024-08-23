# reMarkableToNotionSync
This guide will walk you through automating the process of syncing emails sent from a Remarkable tablet to a Notion database, with any attachments stored in Google Drive. We will set up a Gmail filter that automatically labels emails from Remarkable, and then a Google Apps Script to handle the transfer to Notion.

### Overview

Emails sent from your Remarkable device will be automatically labeled in Gmail, processed to extract content and attachments, and then sent to a Notion database. Attachments are stored in Google Drive, and their links are added to Notion.

### Prerequisites

Before you begin, ensure you have the following:

- **Notion Integration**: A Notion integration with access to your database.
- **Gmail Account**: Access to your Gmail account.
- **Google Drive Folder**: A folder in Google Drive where attachments will be stored.
- **Remarkable Device**: Your Remarkable tablet configured to send emails.

### Step 1: Create Labels and Set Up a Gmail Filter

1. **Create Labels**
    - Create `NotionToSync` (will be used to identify emails that needs to be sent to Notion)
    - Create `SyncedToNotion` (Will be used to identify the already synced emails. The script will remove the `NotionToSync` label and add `SyncedToNotion` once the sync is done)
2. **Create a Gmail Filter**:
    - Go to your Gmail account and click on the search bar.
    - Click on the drop-down arrow to create a filter.
    - In the "From" field, enter the email address that your Remarkable device uses to send emails (`my@remarkable.com`).
    - Click on "Create filter."
    - In the filter creation dialog, select "Apply the label" and create a new label called `NotionToSync`.
    - Click "Create filter" to finalize.
    
    This filter will automatically apply the `NotionToSync` label to any email sent from your Remarkable device.
    

### Step 2: Setup Notion database and Integration

1. In Notion create a new database, (eg: ‘reMarkable Automation'). Get the table id from the URL. Will be used later in the google script
2. Setup the integration: Go to 'Settings & Members' -> 'Integrations' -> 'Develop your own integration'. There create a new integration with any descriptive name (eg: ‘reMarkable Inegration’) and allow to 'Insert content' and 'No user information'. After creating the integration you will be able to retrieve the secret for this integration. Will be needed to add to the Google script on step 3
3. Connect the table with the Integration

### Step 3: Create a Google Apps Script

1. **Open Google Apps Script**:
    - Go to [Google Apps Script](https://script.google.com/) and create a new project.
2. **Copy and Paste the Following Script**:
    
    ```jsx
    const GMAIL_LABEL_NAME = 'NotionToSync';
    const SYNCED_LABEL = 'SyncedToNotion';
    const DRIVE_FOLDER_ID = '<Replace with your Google Drive folder ID>';
    const DATABASE_ID = '<Replace with your Notion database ID>';
    const NOTION_INTEGRATION = 'Bearer <Replace with your Notion integration token>';
    
    const gmailToNotion = () => {
      const label = GmailApp.getUserLabelByName(GMAIL_LABEL_NAME);
      const successLabel = GmailApp.getUserLabelByName(SYNCED_LABEL);
      label.getThreads(0, 20).forEach((thread) => {
        const [message] = thread.getMessages().reverse();
        postToNotion(message);
        thread.removeLabel(label);
        thread.addLabel(successLabel);
        thread.moveToArchive();
      });
    };
    
    function postToNotion(message) {
      const url = 'https://api.notion.com/v1/pages';
      
      // Extract attachments and upload them to Google Drive
      const attachments = message.getAttachments();
      const fileUrls = attachments.map(attachment => {
        // Upload the file to Google Drive
        const driveFile = DriveApp.getFolderById(DRIVE_FOLDER_ID).createFile(attachment);
        
        // Generate a shareable link
        driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        const fileUrl = driveFile.getUrl();
        
        // Return the URL in a format suitable for Notion
        return {
          type: 'external',
          name: attachment.getName(),
          external: {
            url: fileUrl
          }
        };
      });
    
      const body = {
        parent: {
          type: "database_id",
          database_id: DATABASE_ID,
        },
        icon: {
          type: "emoji",
          emoji: "📝"
        },
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: message.getPlainBody()
                  },
                },
              ],
            },
          }
        ],
        properties: {
          Name: {
            title: [
              {
                text: {
                  content: message.getSubject(),
                },
              },
            ],
          },
          Files: { // Assuming "Files" is the name of your file column in Notion
            files: fileUrls
          }
        }
      }
    
      UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: "application/json",
        muteHttpExceptions: false,
        headers: {
          Authorization: NOTION_INTEGRATION,
          'Notion-Version': '2022-02-22'
        },
        payload: JSON.stringify(body)
      });
    }
    ```
    
3. **Replace Placeholder Values**:
    - **`<Replace with your Google Drive folder ID>`**: Enter the ID of your Google Drive folder where attachments will be uploaded.
    - **`<Replace with your Notion database ID>`**: Enter your Notion database ID.
    - **`<Replace with your Notion integration token>`**: Enter your Notion integration token.
4. **Save and Run the Script**:
    - Save the script. Run the `gmailToNotion` function to test the integration. The script will require authorization to access your Gmail, Google Drive, and Notion accounts.

### Step 4: Set Up a Trigger to Automate the Process

1. **Automate the Sync**:
    - In Google Apps Script, go to the "Triggers" menu.
    - Set up a time-driven trigger to run the `gmailToNotion` function periodically (e.g., every 15 min).

This trigger ensures that the script checks for new emails labeled `NotionToSync` and processes them automatically.

### Step 5: Test the Integration

1. **Send an Email from Remarkable**:
    - Create a note on your Remarkable device and send it to your email.
2. **Check Gmail**:
    - Confirm that the email was automatically labeled `NotionToSync`.
3. **Verify Google Drive and Notion**:
    - Check Google Drive to ensure the attachments have been uploaded.
    - Check your Notion database to see if a new entry has been created with the email content and a link to the files.
4. Verify that after sync the email is updated with the new label `SyncedToNotion` 

### Conclusion

This guide has helped you set up an automated workflow that syncs emails from your Remarkable device to a Notion database, with attachments stored in Google Drive. By setting up a Gmail filter and a Google Apps Script, you ensure that your important notes are organized and easily accessible in Notion.

Remember to keep your integration tokens secure and review the permissions granted to the script to ensure privacy and security.
