
const gmailToNotion = () => {
  const label = GmailApp.getUserLabelByName(PropertiesService.getScriptProperties().getProperty('GMAIL_LABEL_NAME'));
  const successLabel = GmailApp.getUserLabelByName(PropertiesService.getScriptProperties().getProperty('SYNCED_LABEL'));
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
    const driveFile = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID')).createFile(attachment);
    
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
      database_id: PropertiesService.getScriptProperties().getProperty('DATABASE_ID'),
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
      Authorization: `Bearer ${PropertiesService.getScriptProperties().getProperty('NOTION_INTEGRATION')}`,
      'Notion-Version': '2022-02-22'
    },
    payload: JSON.stringify(body)
  });
}
