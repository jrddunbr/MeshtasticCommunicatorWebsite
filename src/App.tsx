import React, {useEffect, useState} from "react";
import Header from "@cloudscape-design/components/header";
import Container from "@cloudscape-design/components/container";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Input from "@cloudscape-design/components/input";
import Button from "@cloudscape-design/components/button";
import {
    AppLayout,
    Autosuggest,
    Box,
    Grid, PropertyFilter, PropertyFilterProps,
    Table
} from "@cloudscape-design/components";

export default function App() {

    type message_history_type = {
        source: string
        destination: string
        message: string
        snr: number
        rssi: number
        portnum: string
    }

    type node_data_type = {
        node_id: string
        battery_level: number | null
        voltage: number | null
        last_heard: string | null
        node_name: string | null
        node_short_name: string | null
        snr: number | null
    }[]

    const initial_message_history: message_history_type[] = []
    const [messageHistory, setMessageHistory]: [message_history_type[], ((value: (((prevState: message_history_type[]) => message_history_type[]) | message_history_type[])) => void)] = useState(initial_message_history)

    const initial_nodes_list: node_data_type = []
    const [nodesList, setNodesList]: [node_data_type, ((value: (((prevState: node_data_type) => node_data_type) | node_data_type)) => void)] = useState(initial_nodes_list)

    const [message, setMessage] = useState("")
    const [destination, setDestination] = useState("")

    const initial_query_state: PropertyFilterProps.Query = {tokens: [{ propertyKey: "portnum", value: "TEXT_MESSAGE_APP", operator: "="}], operation: "and"}
    const [query, setQuery] = React.useState(initial_query_state);

    const [filteredMessageHistory, setFilteredMessageHistory]: [message_history_type[], ((value: (((prevState: message_history_type[]) => message_history_type[]) | message_history_type[])) => void)] = useState(initial_message_history)


    useEffect(() => {
        get_nodes()
        get_message_history()
    }, [""])


    useEffect(() => {
        const interval = setInterval(() => get_nodes(), 10000)
        return () => {
            clearInterval(interval)
        }
    })


    useEffect(() => {
        const interval = setInterval(() => get_message_history(), 1000)
        return () => {
            clearInterval(interval)
        }
    })


    useEffect(() => {
        let filteringMessageHistory: message_history_type[]
        if (query.operation == "and") {
            // With "and", we need to remove anything that meets the filter criteria
            filteringMessageHistory = messageHistory
        } else {
            // With "or", we need to add anything that meets the filter criteria
            filteringMessageHistory = []
        }

        function check_match(propertyKey: string, operator: string, value: string, message: message_history_type): boolean {
            let check_value: string = ""
            switch (propertyKey) {
                case "source": {
                    check_value = message.source
                    break
                }
                case "destination": {
                    check_value = message.destination
                    break
                }
                case "portnum": {
                    check_value = message.portnum
                    break
                }
            }
            switch (operator) {
                case ":":{
                    // Contains
                    return check_value.includes(value)
                }
                case "!:": {
                    // Does not contain
                    return !check_value.includes(value)
                }
                case "=": {
                    // Equals
                    return check_value === value
                }
                case "!=": {
                    // Does not equal
                    return check_value !== value
                }
            }
            return false
        }

        for (const q in query.tokens) {
            const propertyKey = query.tokens[q].propertyKey
            const operator = query.tokens[q].operator
            const value = query.tokens[q].value
            if (propertyKey === undefined) continue
            if (query.operation == "and") {
                // With "and", we need to remove anything that meets the filter criteria
                filteringMessageHistory = filteringMessageHistory.filter((msg, _, __) => {
                    return check_match(propertyKey, operator, value, msg)
                })
            } else {
                // With "or", we need to add anything that meets the filter criteria
                filteringMessageHistory.concat(messageHistory.filter((msg, _, __) => {
                    return check_match(propertyKey, operator, value, msg)
                }))
            }
        }
        setFilteredMessageHistory(filteringMessageHistory)
    }, [query, messageHistory])


    async function get_nodes() {
        const result = await fetch("http://localhost:5643/get_nodes", {
            headers: {"Content-Type": "application/json; charset=UTF-8"}
        })
        if (result.ok && result.body != null) {
            const nodes = await result.json()
            setNodesList(nodes)
        }
    }


    async function get_message_history() {
        const result = await fetch("http://localhost:5643/get_messages", {
            headers: {"Content-Type": "application/json; charset=UTF-8"}
        })
        if (result.ok && result.body != null) {
            const message = await result.json()
            setMessageHistory(message)
        }
    }


    async function send_message(message: string, destination: string) {
        const message_details: { destination: string; message: string } = {
            destination: destination,
            message: message
        };
        await fetch("http://localhost:5643/send_message", {
            method: "POST",
            body: JSON.stringify(message_details),
            headers: {"Content-Type": "application/json; charset=UTF-8"}
        });
    }


    function nodes_table(): JSX.Element {
        return <Table
            columnDefinitions={[
                {
                    id: "node_id",
                    header: "Node ID",
                    cell: e => e.node_id,
                    sortingField: "node_id"
                },
                {
                    id: "node_name",
                    header: "Node Name",
                    cell: e => e.node_name,
                    sortingField: "node_name"
                },
                {
                    id: "node_short_name",
                    header: "Node Short Name",
                    cell: e => e.node_short_name,
                    sortingField: "node_short_name"
                },
                {
                    id: "snr",
                    header: "SNR",
                    cell: e => e.snr,
                    sortingField: "snr"
                },
                {
                    id: "last_heard",
                    header: "Last Heard",
                    cell: e => e.last_heard,
                    sortingField: "last_heard"
                },
                {
                    id: "battery",
                    header: "Battery Level",
                    cell: e => `${e.battery_level}%`,
                    sortingField: "battery"
                },
                {
                    id: "voltage",
                    header: "Battery Voltage",
                    cell: e => `${e.voltage} V`,
                    sortingField: "voltage"
                }
            ]}
            items={nodesList}
            loadingText="Loading resources"
            sortingDisabled
            trackBy="name"
            visibleColumns={[
                "node_id",
                "node_name",
                "snr",
                "last_heard",
                "battery",
                "voltage"
            ]}
            empty={
                <Box textAlign="center" color="inherit">
                    <b>No nodes</b>
                    <Box
                        padding={{ bottom: "s" }}
                        variant="p"
                        color="inherit"
                    >
                        No nodes discovered to display.
                    </Box>
                </Box>
            }
            header={
                <Header counter={` (${nodesList.length})`}>
                    Nodes List
                </Header>
            }
        />
    }


    function message_history_table(): JSX.Element {

        const count_text = `${filteredMessageHistory.length} matches`

        return <Table
            columnDefinitions={[
                {
                    id: "source",
                    header: "Source Node",
                    cell: e => e.source,
                    sortingField: "source",
                    width: 30
                },
                {
                    id: "destination",
                    header: "Destination Node",
                    cell: e => e.destination,
                    sortingField: "destination",
                    width: 35
                },
                {
                    id: "snr",
                    header: "SNR",
                    cell: e => {
                        if (e.snr != null) {
                            return `${e.snr}dB`
                        } else {
                            return "N/A"
                        }
                    },
                    sortingField: "snr",
                    width: 25
                },
                {
                    id: "rssi",
                    header: "RSSI",
                    cell: e => e.rssi,
                    sortingField: "rssi",
                    width: 25
                },
                {
                    id: "portnum",
                    header: "Protocol",
                    cell: e => e.portnum,
                    sortingField: "portnum",
                    width: 40
                },
                {
                    id: "message",
                    header: "Message",
                    cell: e => e.message,
                    sortingField: "message"
                }
            ]}
            items={filteredMessageHistory}
            loadingText="Loading resources"
            trackBy="name"
            visibleColumns={[
                "source",
                "destination",
                "snr",
                "portnum",
                "message"
            ]}
            empty={
                <Box textAlign="center" color="inherit">
                    <b>No messages</b>
                    <Box
                        padding={{ bottom: "s" }}
                        variant="p"
                        color="inherit"
                    >
                        No messages to display.
                    </Box>
                </Box>
            }
            header={
                <Header
                    variant={"h2"}
                >
                    Message History
                </Header>
            }
            filter={
                <PropertyFilter
                    onChange={({ detail }) => setQuery(detail)}
                    query={query}
                    i18nStrings={{
                        filteringAriaLabel: "your choice",
                        dismissAriaLabel: "Dismiss",
                        filteringPlaceholder: "Search",
                        groupValuesText: "Values",
                        groupPropertiesText: "Properties",
                        operatorsText: "Operators",
                        operationAndText: "and",
                        operationOrText: "or",
                        operatorLessText: "Less than",
                        operatorLessOrEqualText: "Less than or equal",
                        operatorGreaterText: "Greater than",
                        operatorGreaterOrEqualText:
                            "Greater than or equal",
                        operatorContainsText: "Contains",
                        operatorDoesNotContainText: "Does not contain",
                        operatorEqualsText: "Equals",
                        operatorDoesNotEqualText: "Does not equal",
                        editTokenHeader: "Edit filter",
                        propertyText: "Property",
                        operatorText: "Operator",
                        valueText: "Value",
                        cancelActionText: "Cancel",
                        applyActionText: "Apply",
                        allPropertiesLabel: "All properties",
                        tokenLimitShowMore: "Show more",
                        tokenLimitShowFewer: "Show fewer",
                        clearFiltersText: "Clear filters",
                        removeTokenButtonAriaLabel: () => "Remove token",
                        enteredTextLabel: text => `Use: "${text}"`
                    }}
                    countText={count_text}
                    filteringOptions={[
                        { propertyKey: "portnum", value: "ADMIN_APP" },
                        { propertyKey: "portnum", value: "ROUTING_APP" },
                        { propertyKey: "portnum", value: "TEXT_MESSAGE_APP" },
                        { propertyKey: "portnum", value: "TELEMETRY_APP" },
                        { propertyKey: "portnum", value: "NODEINFO_APP"}
                    ]}
                    filteringProperties={[
                        {
                            key: "source",
                            operators: ["=", "!=", ":", "!:"],
                            propertyLabel: "Source node",
                            groupValuesLabel: "Source node label"
                        },
                        {
                            key: "destination",
                            operators: ["=", "!=", ":", "!:"],
                            propertyLabel: "Destination node",
                            groupValuesLabel: "Destination node label"
                        },
                        {
                            key: "portnum",
                            operators: ["=", "!=", ":", "!:"],
                            propertyLabel: "Port type",
                            groupValuesLabel: "Port type label"
                        }
                    ]}
                />
            }
        />
    }


    function send_message_container(): JSX.Element {
        const nodes_id_list: { value: string }[] = nodesList.map((g) => ({ value: g.node_id }))
        nodes_id_list.push({ value: '^all' })

        return <Container>
            <SpaceBetween size="s">
                <Header
                    variant={"h2"}
                >
                    Send Message
                </Header>
                <Input
                    value={message}
                    onChange={(event) => {
                        setMessage(event.detail.value)
                    }}
                    placeholder={"Send a message..."}
                />
                <Grid
                    gridDefinition={[{colspan: 7}, {colspan: 5}]}
                >
                    <Autosuggest
                        onChange={({ detail }) => {
                            setDestination(detail.value)
                        }}
                        value={destination}
                        options={nodes_id_list}
                        enteredTextLabel={value => `Use: "${value}"`}
                        placeholder="Enter Destination Node ID"
                        empty="No matches found"
                    />
                    <Button
                        variant="primary"
                        onClick={(_) => {
                            send_message(message, destination)
                            setMessage("")
                        }}
                    >
                        Send Message
                    </Button>
                </Grid>
            </SpaceBetween>
        </Container>
    }


    function app_layout_contents(): JSX.Element {
        return <SpaceBetween size="m">
            <Header variant="h1">Meshtastic Communicator</Header>
            {message_history_table()}
            <Grid
                gridDefinition={[{ colspan: 6 }, { colspan: 6 }]}
            >
                {send_message_container()}
                {nodes_table()}
            </Grid>
        </SpaceBetween>
    }

    return (
        <AppLayout
            content={
                app_layout_contents()
            }
            toolsHide={true}
            navigationHide={true}
        />
    );
}
