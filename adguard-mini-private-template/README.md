# AdGuard Mini Private

Directory containing private configuration settings. Here you can find the templates you need.

## Structure

Folder `adguard-mini-private` contains:

- `config.env` - Environment variables for keychain and support scripts repositories
- `configuration` folder:
  - `Config.xcconfig` - Customizable constants such as Team ID, Application ID, app group, and company name

## Development

1. You need to copy the template folder to the same level as the main repository so that the structure is as follows:

```
- Base folder:
  - adguard-mini
  - adguard-mini-private
```

2. Remove the ".template" from all files and fill the templates with your data.
