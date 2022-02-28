/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as React from 'react';
import {useCallback, useState, useEffect} from 'react';
import {
  StyleSheet,
  View,
  Image as ImageCMP,
  ScrollView,
  Dimensions,
  Text,
  ActivityIndicator,
  Button,
  BackHandler,
  Alert,
  SafeAreaView,
  Linking,
} from 'react-native';
import {
  Camera,
  Image,
  ImageUtil,
  MobileModel,
  ModelResultMetrics,
} from 'react-native-pytorch-core';
import type {ModelInfo} from 'react-native-pytorch-core';
import {ImageClassificationModels} from '../Models';
import ImageClassInfo from '../components/ImageClassInfo';
import ModelSelector from '../components/ModelSelector';
import ModelPreloader from '../components/ModelPreloader';
import useImageModelInference from '../useImageModelInference';
import {
  PTLColors as colors,
  PTLFontSizes as fontsizes,
} from '../components/UISettings';
import Icon from 'react-native-vector-icons/FontAwesome';
const MobileNetV3Classes = require('../MobileNetV3Classes');

const windowWidth = Dimensions.get('window').width;
const targetResolution = {width: 480, height: 640};

export default function CameraExample() {
  const [activeModelInfo, setActiveModelInfo] = useState<ModelInfo>(
    ImageClassificationModels[0],
  );
  const {imageClass, metrics, processImage} = useImageModelInference(
    activeModelInfo,
  );
  const [isCaptured, setIsCaptured] = useState<Boolean>(false);
  const [currImage, setCurrImage] = useState<string>('');
  const [classesInfo, setClassesInfo] = useState<
    Array<{
      className: string;
      confidence: number;
      metrics: ModelResultMetrics;
    }>
  >([]);
  const cameraRef = React.useRef<Camera>(null);

  useEffect(() => {
    const backAction = () => {
      if (isCaptured) {
        handlePressReturn();
        return true;
      } else {
        Alert.alert('Hold on!', 'Are you sure you want to quit?', [
          {
            text: 'Cancel',
            onPress: () => null,
            style: 'cancel',
          },
          {text: 'YES', onPress: () => BackHandler.exitApp()},
        ]);
        return true;
      }
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => backHandler.remove();
  }, [isCaptured]);

  const handleFrame = useCallback(
    async (image: Image) => {
      if (isCaptured) {
        image.release();
        return;
      }
      await processImage(image);
      image.release();
    },
    [processImage, isCaptured],
  );

  const classifier = async (image: Image) => {
    type ImageClassificationResult = {
      maxIdx: number;
      confidence: number;
    };
    const classes = [];
    for (let i = 0; i < 3; i++) {
      const {
        result: {maxIdx, confidence},
        metrics: m,
      } = await MobileModel.execute<ImageClassificationResult>(
        ImageClassificationModels[i].model,
        {
          image,
        },
      );
      const className = MobileNetV3Classes[maxIdx];
      classes.push({
        className,
        confidence: Math.round(confidence * 1000) / 10,
        metrics: m,
      });
    }
    return classes;
  };

  const handleCapture = async (img: Image) => {
    const imagePath = 'file://' + (await ImageUtil.toFile(img));
    setIsCaptured(true);
    setCurrImage(imagePath);
    const classes = await classifier(img);
    setClassesInfo(classes);
    img.release();
  };

  const handlePressReturn = () => {
    setClassesInfo([]);
    setCurrImage('');
    setIsCaptured(false);
  };

  const handleSubmit = () => {};

  return (
    <ModelPreloader modelInfos={ImageClassificationModels}>
      {isCaptured ? (
        <SafeAreaView style={styles.container}>
          <ScrollView style={styles.scrollView}>
            <View style={styles.return}>
              <Button
                color={colors.accent2}
                title="Return ↩"
                onPress={handlePressReturn}
              />
            </View>
            {currImage !== '' && (
              <ImageCMP
                style={styles.image}
                source={{...targetResolution, uri: currImage}}
              />
            )}
            {!classesInfo[0] ? (
              <ActivityIndicator size="large" color={colors.accent2} />
            ) : (
              <Text style={styles.classes}>
                {'\n'}
                {classesInfo.map((c, i) => {
                  const {className, confidence} = c;
                  return (
                    <View style={styles.innerClasses} key={i}>
                      <Text>
                        <Text>
                          {className}:{'   '}
                          <Text
                            style={{
                              color: colors.accent1,
                              fontSize: fontsizes.h3,
                            }}>
                            {confidence}%{'\n'}
                          </Text>
                        </Text>
                      </Text>
                    </View>
                  );
                })}
              </Text>
            )}
            <View style={styles.submit}>
              <Button title="Sumbit" onPress={handleSubmit} />
            </View>
          </ScrollView>
        </SafeAreaView>
      ) : (
        <>
          <Camera
            ref={cameraRef}
            hideCaptureButton={false}
            onFrame={handleFrame}
            onCapture={handleCapture}
            style={styles.camera}
            targetResolution={targetResolution}
          />
          <ModelSelector
            style={styles.actions}
            modelInfos={ImageClassificationModels}
            defaultModelInfo={activeModelInfo}
            onSelectModelInfo={setActiveModelInfo}
          />
          <View style={styles.info}>
            <ImageClassInfo imageClass={imageClass} metrics={metrics} />
          </View>
          <Icon
            style={styles.infoIcon}
            name="info"
            size={40}
            color="#ededed"
            onPress={() => Linking.openURL('https://example.com')}
          />
        </>
      )}
    </ModelPreloader>
  );
}

const styles = StyleSheet.create({
  camera: {
    flex: 1,
  },
  info: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    width: '100%',
    overflow: 'scroll',
  },
  actions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  container: {
    flex: 1,
    top: 0,
    left: 0,
    zIndex: 99,
  },
  scrollView: {
    flex: 1,
  },
  image: {
    flex: 1,
    width: windowWidth,
    height: (4 / 3) * windowWidth,
  },
  classes: {
    flex: 1,
    padding: 25,
    backgroundColor: 'rgba(200,200,200,0.75)',
    color: '#2b2b2b',
  },
  innerClasses: {
    flex: 1,
    display: 'flex',
    flexWrap: 'wrap',
    overflow: 'scroll',
  },
  return: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 100,
  },
  submit: {
    flex: 1,
    width: '100%',
    position: 'absolute',
    top: (4 / 3) * windowWidth - 30,
  },
  infoIcon: {
    position: 'absolute',
    bottom: 30,
    left: 57,
  },
});
