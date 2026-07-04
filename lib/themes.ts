// Color values translated from constants.dart (ColorProfile / Flutter Material colors).
// Hex strings map 1-to-1 with Color.fromARGB(255, r, g, b) values in the Flutter source.

export interface ColorProfile {
  idKey: string;
  backgroundColor: string;
  headerColor: string;
  buttonColor: string;
  textColor: string;
  contrastTextColor: string;
  checkAnswerButtonColor: string;
  clearAnswerButtonColor: string;
  disabledButtonColor: string;
}

export const greenTheme: ColorProfile = {
  idKey: 'green flavor',
  backgroundColor: '#799c54',       // Color.fromARGB(255, 121, 156, 84)
  headerColor: '#668446',           // Color.fromARGB(255, 102, 132, 70)
  buttonColor: '#60c6d8',           // Color.fromARGB(255, 96, 198, 216)
  textColor: '#000000',             // Colors.black
  contrastTextColor: '#ffffff',     // Colors.white
  checkAnswerButtonColor: '#6fd800', // Color.fromARGB(255, 111, 216, 0)
  clearAnswerButtonColor: '#e04444', // Color.fromARGB(255, 224, 68, 68)
  disabledButtonColor: '#9e9e9e',   // Colors.grey (default)
};

export const blueTheme: ColorProfile = {
  idKey: 'blue flavor',
  backgroundColor: '#6ea6bd',       // Color.fromARGB(255, 110, 166, 189)
  headerColor: '#608796',           // Color.fromARGB(255, 96, 135, 150)
  buttonColor: '#9dd9e4',           // Color.fromARGB(255, 157, 217, 228)
  textColor: '#000000',             // Colors.black
  contrastTextColor: '#ffffff',     // Colors.white
  checkAnswerButtonColor: '#6fd800', // Color.fromARGB(255, 111, 216, 0)
  clearAnswerButtonColor: '#e04444', // Color.fromARGB(255, 224, 68, 68)
  disabledButtonColor: '#9e9e9e',
};

export const lightTheme: ColorProfile = {
  idKey: 'light flavor',
  backgroundColor: '#ffffff',       // Colors.white
  headerColor: '#03a9f4',           // Colors.lightBlue (Material primary)
  buttonColor: '#607d8b',           // Colors.blueGrey
  textColor: '#000000',             // Colors.black
  contrastTextColor: '#000000',     // Colors.black
  checkAnswerButtonColor: '#4caf50', // Colors.green
  clearAnswerButtonColor: '#f44336', // Colors.red
  disabledButtonColor: '#9e9e9e',
};

export const darkTheme: ColorProfile = {
  idKey: 'dark flavor',
  backgroundColor: '#000000',       // Color.fromARGB(255, 0, 0, 0)
  headerColor: '#707070',           // Color.fromARGB(255, 112, 112, 112)
  buttonColor: '#9e9e9e',           // Colors.grey
  textColor: '#ffffff',             // Color.fromARGB(255, 255, 255, 255)
  contrastTextColor: '#ffffff',     // Color.fromARGB(255, 255, 255, 255)
  checkAnswerButtonColor: '#4caf50', // Colors.green
  clearAnswerButtonColor: '#f44336', // Colors.red
  disabledButtonColor: '#9e9e9e',
};

/** Ordered array of themes matching ThemeController._getProfileByIndex() indices (0–3). */
export const themes: [ColorProfile, ColorProfile, ColorProfile, ColorProfile] = [
  greenTheme,
  blueTheme,
  lightTheme,
  darkTheme,
];
