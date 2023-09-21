//@ts-nocheck
import React, {useState, useEffect, useRef} from 'react';
import {Alert, DeviceEventEmitter, ScrollView, Text} from 'react-native';
import {RNSerialport, definitions, actions} from 'react-native-serialport';
import {appColors} from '../../../constants/colors';
import ResultsModal from './results';
import FullPageLoader from '../../full-page-loader';

const TestResults = ({navigation}) => {
  const [servisStarted, setServisStarted] = useState(false);
  const [connected, setConnected] = useState(false);
  const [usbAttached, setUsbAttached] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [actionLogs, setActionLogs] = useState([]);
  const [outputArray, setOutputArray] = useState([]);
  const [baudRate, setBaudRate] = useState('9600');
  const [interfaceValue, setInterfaceValue] = useState('-1');
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceList, setDeviceList] = useState([]);
  const [sendHexForReadingCardStatus, setSendHexForReadingCardStatus] =
    useState('AAAA010101000000000000000000FA31');
  const [
    sendHexForReadingStateOfDroppingBlood,
    setSendHexForReadingStateOfDroppingBlood,
  ] = useState('AAAA010201000000BE3E');
  const [
    sendHexForGettingMeasurementResults,
    setSendHexForGettingMeasurementResults,
  ] = useState('AAAA010301000000000000000000423A');
  const [returnedDataType, setReturnedDataType] = useState(
    definitions.RETURNED_DATA_TYPES.HEXSTRING,
  );

  //modal
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [testResult, setTestResult] = useState(0);
  const scrollViewRef = useRef<any>(null);

  useEffect(() => {
    startUsbListener();
    return () => {
      stopUsbListener();
    };
  }, []);

  const startUsbListener = () => {
    DeviceEventEmitter.addListener(
      actions.ON_SERVICE_STARTED,
      onServiceStarted,
    );
    DeviceEventEmitter.addListener(
      actions.ON_SERVICE_STOPPED,
      onServiceStopped,
    );
    DeviceEventEmitter.addListener(
      actions.ON_DEVICE_ATTACHED,
      onDeviceAttached,
    );
    DeviceEventEmitter.addListener(
      actions.ON_DEVICE_DETACHED,
      onDeviceDetached,
    );
    DeviceEventEmitter.addListener(actions.ON_ERROR, onError);
    DeviceEventEmitter.addListener(actions.ON_CONNECTED, onConnected);
    DeviceEventEmitter.addListener(actions.ON_DISCONNECTED, onDisconnected);
    DeviceEventEmitter.addListener(actions.ON_READ_DATA, onReadData);

    RNSerialport.setReturnedDataType(returnedDataType);
    RNSerialport.setAutoConnect(false);
    RNSerialport.startUsbService();
  };

  const stopUsbListener = async () => {
    DeviceEventEmitter.removeAllListeners();
    const isOpen = await RNSerialport.isOpen();
    if (isOpen) {
      Alert.alert('isOpen', isOpen);
      RNSerialport.disconnect();
    }
    RNSerialport.stopUsbService();
  };

  const onServiceStarted = response => {
    setServisStarted(true);
    if (response.deviceAttached) {
      onDeviceAttached();
    }
  };

  const onServiceStopped = () => {
    setServisStarted(false);
    Alert.alert('service stopped');
  };

  const onDeviceAttached = () => {
    setUsbAttached(true);
    fillDeviceList();
  };

  const onDeviceDetached = () => {
    setUsbAttached(false);
    setSelectedDevice(null);
    setDeviceList([]);
  };

  const onConnected = () => {
    setConnected(true);
    setActionLogs(prev => [...prev, 'USB connected']);
  };

  const onDisconnected = () => {
    setConnected(false);
    setActionLogs(prev => [...prev, 'USB disconnected']);
  };

  const onReadData = data => {
    try {
      if (returnedDataType === definitions.RETURNED_DATA_TYPES.INTARRAY) {
        const payload = RNSerialport.intArrayToUtf16(data.payload);
        if (output.length < 32) {
          setOutput(prev => prev + data.payload);
        }
      } else if (
        returnedDataType === definitions.RETURNED_DATA_TYPES.HEXSTRING
      ) {
        const payload = RNSerialport.hexToUtf16(data.payload);
        // setOutput(prev => prev + ' ' + data.payload);
        if (output.length < 32) {
          setOutput(prev => prev + data.payload);
        }
      } else {
        // setOutput(prev => prev + ' ' + JSON.stringify(data));
        if (output.length < 32) {
          setOutput(prev => prev + JSON.stringify(data));
        }
      }
    } catch (error) {
      handleClearButton();
      setActionLogs(prev => [
        ...prev,
        'Error while reading device data ' + error.message,
      ]);
    }
  };

  const onError = error => {
    setError(JSON.stringify(error));
  };

  const fillDeviceList = async () => {
    try {
      const deviceList = await RNSerialport.getDeviceList();
      if (deviceList.length > 0) {
        setActionLogs(prev => [
          ...prev,
          'Found: ' + deviceList?.length + ' devices',
        ]);
        setActionLogs(prev => [
          ...prev,
          'Devices Found: ' + JSON.stringify(deviceList),
        ]);
        setDeviceList(deviceList);
      } else {
        // setDeviceList([{name: 'Device Not Found', placeholder: true}]);
        setActionLogs(prev => [...prev, 'Device Not Found']);
      }
    } catch (err) {
      Alert.alert(
        'Error from getDeviceList()',
        err.errorCode + ' ' + err.errorMessage,
      );
    }
  };

  // const handleSendButton = () => {
  //   RNSerialport.writeString(sendText);
  // };

  const handleSendButtonHex = hexCode => {
    RNSerialport.writeHexString(hexCode);
  };

  const handleClearButton = () => {
    setOutput('');
    setOutputArray([]);
    setTestResult(0);
  };

  const handleConnectButton = async () => {
    const isOpen = await RNSerialport.isOpen();
    if (isOpen) {
      setActionLogs(prev => [...prev, 'Disconnecting, USB already opened.']);
      RNSerialport.disconnect();
    } else {
      if (!selectedDevice) {
        alert('Please choose a device');
        await fillDeviceList();
        return;
      }
      RNSerialport.setInterface(parseInt(interfaceValue, 10));
      RNSerialport.connectDevice(selectedDevice.name, parseInt(baudRate, 10));
    }
  };

  useEffect(() => {
    if (usbAttached) {
      //select device
      if (deviceList.length > 0) {
        //select the first divice
        setActionLogs(prev => [
          ...prev,
          'Selecting device ' + deviceList[0]?.name,
        ]);
        setSelectedDevice(deviceList[0]);
      }
    } else {
      setActionLogs(prev => [...prev, 'USB not attached!']);
    }
  }, [usbAttached, deviceList]);

  useEffect(() => {
    //connect to selected device
    if (selectedDevice !== null) {
      setActionLogs(prev => [...prev, 'Connecting to ' + selectedDevice?.name]);
      handleConnectButton();
    } else {
      setActionLogs(prev => [...prev, 'No device selected']);
    }
  }, [selectedDevice]);

  useEffect(() => {
    if (connected) {
      setActionLogs(prev => [...prev, 'Device connected']);
      setActionLogs(prev => [...prev, 'Getting measurement results....']);
      //clearing old value
      handleClearButton();
      handleSendButtonHex(sendHexForGettingMeasurementResults);
      setActionLogs(prev => [...prev, 'Waiting for output...']);
    }
  }, [connected]);

  useEffect(() => {
    //logging errors
    if (error === '') return;
    setActionLogs(prev => [...prev, 'Error: ' + error]);
  }, [error]);

  useEffect(() => {
    try {
      if (output.length === 32) {
        setActionLogs(prev => [...prev, 'Output: ' + output]);
        //calculate result
        let firstSection = 0;
        let secondSection = 0;
        for (let i = 12; i <= 17; i++) {
          let vr = Number(output[i]);
          if (typeof vr === 'number' && !Number.isNaN(vr)) {
            firstSection += vr;
          }
        }

        //
        const remeinder1 = Number(output[21]);
        const remeinder2 = Number(output[23]);
        const remeinder3 = Number(output[25]);
        if (typeof remeinder1 === 'number' && !Number.isNaN(remeinder1)) {
          secondSection += remeinder1 / 10;
        }
        if (typeof remeinder2 === 'number' && !Number.isNaN(remeinder2)) {
          secondSection += remeinder2 / 100;
        }
        if (typeof remeinder3 === 'number' && !Number.isNaN(remeinder3)) {
          secondSection += remeinder3 / 1000;
        }
        const res = firstSection + secondSection;
        setTestResult(res);
        //
        if (!showModal) {
          setIsLoading(false);
          setShowModal(true);
        }
      }
    } catch (error) {
      setActionLogs(prev => [
        ...prev,
        'Error while calculating the output. ' + error.message,
      ]);
    }
  }, [output]);

  return (
    <View style={{flex: 1}}>
      <ScrollView
        ref={scrollViewRef}
        onContentSizeChange={() =>
          scrollViewRef?.current &&
          scrollViewRef.current?.scrollToEnd({animated: true})
        }
        contentContainerStyle={{flexGrow: 1}}>
        {actionLogs.map((log, index) => (
          <Text
            key={index}
            style={{
              color: appColors.BLACK,
              padding: 10,
              borderBottomColor: appColors.BORDER_COLOR,
              borderBottomWidth: 1,
            }}>
            {log}
          </Text>
        ))}
      </ScrollView>
      <ResultsModal
        setShowModal={setShowModal}
        showModal={showModal}
        navigation={navigation}
        result={testResult}
      />
      <FullPageLoader isLoading={isLoading} />
    </View>
  );
};

export default TestResults;
