# Localization
Watch9 Reconstruct relies on custom strings not gathered from InnerTube, and this can cause the following for languages currently not implemented:

* "Subscribers" suffix not being removed from subscriber count
* Strings being in English

If you want to help me out and add more languages, you're in the right place! Just read the rest of this document.

### *Note: You'll need a GitHub account to do this.*

## 1. Fork the repository
Near the top right of this repository's GitHub page, you'll find a "Fork" button. Click that, and it'll create a copy of this repository on your account.

## 2. Add your language
In `Watch9Reconstruct.user.js`, there is a constant variable at the beginning of the script called `w9ri18n`. This holds the localization strings.

**Things to keep in mind:**
* `%s` is the indicator the code uses to put custom content there. This is used for example, by the publish date, which is `Published on %s` in English.
* Those regexes are for matching strings from YouTube itself. Go in and get those from YouTube in your language.
* The language indicator is the two-letter code that Google uses. A full list can be found [here](https://gist.github.com/JT5D/a2fdfefa80124a06f5a9).

## 3. Open a pull request
Commit your changes to your fork of the repository, and open up a pull request in the main repository.