import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../../theme/colors';

export default function DisclaimerBanner() {
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        Data may not reflect current regulations. Always verify with MD DNR.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.forestDark,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  text: {
    fontSize: 10,
    color: Colors.amber,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
