import React, {useEffect, useState} from 'react';
import {Box, ChakraProvider, theme} from '@chakra-ui/react';
import {Header} from './components/header/Header';
import {Route, Switch} from 'react-router-dom';
import HomePage from './pages/HomePage';
import useFetch from './utils/useFetch';
import {ConfigurationParameters} from "./translation/ConfigurationParameters";
import {translateParametersToJson} from "./translation/Translation";

function App() {
    const makerchipFetch = useFetch("https://faas.makerchip.com")

    const [configuratorGlobalSettings, setConfiguratorGlobalSettings] = useState({
        settings: getInitialSettings(),
        coreJson: null,
        generalSettings: {
            isa: 'RISCV',
            depth: 4
        }
    })

    const [sVForJson, setSVForJson] = useState()
    const [tlvForJson, setTlvForJson] = useState()
    const [macrosForJson, setMacrosForJson] = useState()

    useEffect(() => {
        translateParametersToJson(configuratorGlobalSettings, setConfiguratorGlobalSettings);
        const json = {
            general: configuratorGlobalSettings.generalSettings,
            pipeline: configuratorGlobalSettings.settings
        };
        if (JSON.stringify(configuratorGlobalSettings.coreJson) !== JSON.stringify(json)) {
            setConfiguratorGlobalSettings({
                ...configuratorGlobalSettings,
                coreJson: json
            })
        }
    }, [configuratorGlobalSettings.generalSettings, configuratorGlobalSettings.settings]);

    function getInitialSettings() {
        const settings = {
            cores: 1
        }
        ConfigurationParameters.forEach(param => settings[param.jsonKey] = param.defaultValue)
        return settings
    }

    async function getSVForTlv(tlv, callback) {
        const data = await makerchipFetch.post(
            "/function/sandpiper-faas",
            {
                args: "-i test.tlv -o test.sv --m4out out/m4out",
                responseType: "json",
                sv_url_inc: true,
                files: {
                    "test.tlv": tlv
                }
            },
            false,
        )

        setTlvForJson(data["out/m4out"].split("\n").map(line => line.trim()).filter(line => line.length > 0).join("\n"))
        setMacrosForJson(tlv.split("\n"))
        const verilog = data["out/test.sv"].replace("`include \"test_gen.sv\"", "// gen included here\n" + data["out/test_gen.sv"])
        callback(verilog)
    }

    return <ChakraProvider theme={theme}>
        <Box minHeight='480px'>
            <Header/>

            <Box mx={5} overflowWrap>
                <Switch>
                    <Route exact path='/'>
                        <HomePage configuratorGlobalSettings={configuratorGlobalSettings}
                                  setConfiguratorGlobalSettings={setConfiguratorGlobalSettings}
                                  getSVForTlv={getSVForTlv}
                                  sVForJson={sVForJson}
                                  setSVForJson={setSVForJson}
                                  macrosForJson={macrosForJson}
                                  tlvForJson={tlvForJson}
                        />
                    </Route>
                </Switch>
            </Box>
        </Box>
    </ChakraProvider>;
}

export default App;