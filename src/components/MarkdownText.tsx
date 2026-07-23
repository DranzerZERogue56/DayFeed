import React from 'react';
import { Pressable, StyleSheet, Text, View, type TextStyle } from 'react-native';
import { parseMarkdownLines } from '../lib/markdownList';
import { spacing, type ColorPalette } from '../theme';
import { useStyles, useTheme } from '../hooks/ThemeContext';
import { CheckboxIcon } from './Icons';

interface Props {
  content: string;
  textStyle: TextStyle;
  /** Present only where a checkbox tap can be persisted. */
  onToggleCheckbox?: (lineIndex: number) => void;
}

// Read-only rendering for the markdown-lite lists typed via useMarkdownInput:
// numbered/bulleted lines get a styled marker, checkbox lines get a tappable
// box. TextInput can't render tappable widgets while actively editing, so
// this view is only used outside of edit mode.
export default function MarkdownText({ content, textStyle, onToggleCheckbox }: Props) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const lines = parseMarkdownLines(content);

  return (
    <View>
      {lines.map((line, i) => {
        if (line.type === 'ordered') {
          return (
            <View key={i} style={styles.row}>
              <Text style={[textStyle, styles.marker]}>{line.order}.</Text>
              <Text style={[textStyle, styles.body]}>{line.body}</Text>
            </View>
          );
        }
        if (line.type === 'bullet') {
          return (
            <View key={i} style={styles.row}>
              <Text style={[textStyle, styles.marker]}>•</Text>
              <Text style={[textStyle, styles.body]}>{line.body}</Text>
            </View>
          );
        }
        if (line.type === 'checkbox') {
          const inner = (
            <View style={styles.row}>
              <View style={styles.checkboxWrap}>
                <CheckboxIcon size={18} color={colors.accent} checked={line.checked} />
              </View>
              <Text style={[textStyle, styles.body, line.checked && styles.checkedBody]}>
                {line.body}
              </Text>
            </View>
          );
          return onToggleCheckbox ? (
            <Pressable key={i} onPress={() => onToggleCheckbox(i)}>
              {inner}
            </Pressable>
          ) : (
            <View key={i}>{inner}</View>
          );
        }
        // A blank plain line still needs to render (as spacing), not collapse.
        return (
          <Text key={i} style={textStyle}>
            {line.body || ' '}
          </Text>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    marker: {
      marginRight: spacing.sm,
    },
    body: {
      flex: 1,
    },
    checkboxWrap: {
      marginRight: spacing.sm,
      paddingTop: 3,
    },
    checkedBody: {
      color: colors.textFaint,
      textDecorationLine: 'line-through',
    },
  });
