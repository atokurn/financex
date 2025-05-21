# FinanceX Backup and Restore System

This document provides an overview of the backup and restore functionality in the FinanceX application.

## Overview

The backup and restore system allows users to:

1. **Export** all their data in different formats (JSON, Excel, SQL)
2. **Import** previously exported data back into the system

## Backup Features

### Supported Export Formats

- **JSON** (Recommended): Complete data backup in a structured JSON format. Best for future restoration within the system.
- **Excel (XLSX)**: Data organized in multiple worksheets for easy viewing and editing in spreadsheet applications.
- **SQL**: Database dump with INSERT statements. Useful for database-level restoration.

### What Gets Backed Up

The backup includes all user data:
- Products and their properties
- Materials and inventory
- Product-material relationships
- Orders and order history
- Sales records
- Purchases and purchase items
- Additional costs
- Expenses and expense items
- Stock history

> **Note**: Backups do not include uploaded images. Please download and save your images separately.

## Restoring Data

### Supported Import Formats

- **JSON**: Recommended format for complete data restoration
- **Excel (XLSX)**: Supports importing data from Excel backups
- **SQL**: Currently not supported for import through the web interface

### Import Process

When importing data:
- The system identifies existing records by their IDs
- Existing records will be updated with the data from the backup
- New records will be created
- Data integrity is maintained by importing in the correct order (base entities first, then relationships)

### Important Considerations

- Importing data will merge with your existing data
- Duplicate entries are identified by their unique IDs
- It is recommended to perform imports on a new account or after backing up your current data
- The import process may take some time depending on the size of your backup file

## How to Use

### Creating a Backup

1. Navigate to **Dashboard > Settings > Backup Data**
2. Select the **Export Data** tab
3. Choose between **Standard Backup** (JSON) or **Advanced Options** (JSON, Excel, SQL)
4. Click **Backup Now** or **Create [FORMAT] Backup**
5. The file will be downloaded to your device

### Importing Data

1. Navigate to **Dashboard > Settings > Backup Data**
2. Select the **Import Data** tab
3. Click **Choose File** and select your backup file (JSON or XLSX)
4. Click **Import Backup**
5. Wait for the import process to complete

## Troubleshooting

**Error: Failed to create backup**
- Check your network connection
- Ensure you have permission to download files
- Try a different export format

**Error: Failed to import data**
- Verify the file is not corrupted
- Check that the file format is supported (JSON or XLSX)
- Ensure the backup belongs to your user account

**Error: This backup belongs to a different user account**
- For security reasons, you can only import backups created by your own account

## Best Practices

- Create regular backups of your data
- Store backups in multiple locations
- Include the date in backup filenames
- Test the restoration process periodically
- Keep a log of backup activities 