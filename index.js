import {Layout, Table, DatePicker, Space, Button, Select, Alert, Spin, TreeSelect, Checkbox, Input, AutoComplete, Modal, TimePicker} from "antd";

const {RangePicker} = DatePicker;
const {Option} = Select;
const { TextArea } = Input;
// const {  TimePicker  } = antd;


import {layoutSider} from '../app/app.module.scss'
import React, {Component, lazy, Suspense, useState, useEffect} from "react";
import {useQuery, useLazyQuery} from "@apollo/client";
import gql from "graphql-tag";

const {Sider, Content} = Layout;
import './index.css'

const GQL_REPORT_LIST = gql`
    query {
        reportList {
            template {
                id
                name 
                descr
                reportDescr    
                fields {
                    descr
                    listHeaders
                    colCount
                }
                            
            }
            optionsList {
                type
                name  
                isRequired
            } 
            title  
            descr         
        }
    }`;


const GQL_ORG_TREE = gql`query {
        orgTree {
            title
            value
            key
            children {
                title
                value
                key
                children {
                    title
                    value
                    key
                }
            }
        }    
    }`;

const GQL_TS_GROUPS = gql`query {
        tsGroups {
            id
            name           
        }
    }`;

export const GQL_CAR_LIST = gql`
    query ($value: String) {
        carList(value: $value) {
            idMO
            classMO
            nameMO
            moUid
        }
    }`;

export const GQL_ZONE_LIST = gql`
    query {
        zoneList {
            key
            zoneName
            zoneGroup
        }
    }`;

export const GQL_SENSOR_LIST = gql`
    query ($idMO: Int) {
        sensorList(idMO: $idMO) {
            idSensor
            idSensorType
            sensNum
            description
        }
    }`;

const GQL_REPORT = gql`query ($params: String, $id: Int) {
        report(params: $params, id: $id)
    }`;

function ReportPage() {
  const {loading, error, data} = useQuery(GQL_REPORT_LIST);
  const [paramMap, setParam] = useState(new Map());
  const [filled, setFilled] = useState(false);
  const [selected, setSelected] = useState(0);
  var reportList = data && data.reportList;
  var report = reportList && reportList.length > 0 && reportList[selected];

  const onChangeReportParameter = (key, value) => {
    if (key.constructor === Array && key.constructor === Array)  {
      setParam(map => {
        map = new Map();    //new Map чтобы ре-рендерелись компоненты
        map.set(key[0], value[0]);
        map.set(key[1], value[1]);
        return map;
      });
    } else {
      setParam(map => new Map(map.set(key, value)));   //new Map чтобы ре-рендерелись компоненты
    }
    // TODO: kill OLD THREAD
    // setTimeout(() => {
      // setReload(true);
    // }, 500);
  }

  useEffect(() => {
    var filled = report && checkAllOptionsFilled(report.optionsList, paramMap);
    setFilled(filled);
  }, [selected, paramMap]);

  return <Layout className={"report-page"}>
    <Sider className={layoutSider} width={400}>
      <div className={"report-name"}>Отчет</div>
      <Select status={filled ? "" : "error"} style={{width: "100%"}} onChange={(value) => {
        setSelected(parseInt(value));
      }} value={selected}>
        {reportList && reportList.map((item, key) =>
          <Option value={key} key={key}>{item.template.name}</Option>
        )}
      </Select>
      {report && <div className={"parameters"}>
        {report.optionsList.map((item, key) => {
          return <ReportParameter type={item.type} name={item.name} onChangeReportParameter={onChangeReportParameter}/>
        })
        }
        {/*<Alert message={report.template.descr} type="info" description={report.template.reportDescr}/>*/}

        <Button type="primary">Применить</Button>
        <div className={"ant-alert ant-alert-info"}>
          <div className={"ant-alert-content"} dangerouslySetInnerHTML={{__html: report.descr}}/>
        </div>
      </div>
      }

    </Sider>
    <Content><ReportTable report={report} paramMap={paramMap} filled={filled}/></Content>

  </Layout>
}

function ReportParameter({type, name, onChangeReportParameter}) {
  switch (type) {
    case "ORGS":
      return <div>
        <div className={"param-name"}>{name}</div>
        <OrgTree onChangeReportParameter={onChangeReportParameter}/>
      </div>

    case "CAR_GROUP":
      return <div>
        <div className={"param-name"}>{name}</div>
        <GroupList
          // onChange
        />
      </div>;
    case "FLAG":
      return <Checkbox className={"report-name"}
          // onChange={onChange}
        >{name}</Checkbox>
    case "DATE_START_AND_FINISH":
      return <DateRange name={name} onChangeReportParameter={onChangeReportParameter} format={"DD.MM.YYYY"}/>
    case "DATETIME_START_AND_FINISH":
      return <DateRange name={name} onChangeReportParameter={onChangeReportParameter} format={"DD.MM.YYYY HH:mm:ss"}/>
    case "YEAR":
      return <div>
        <div className={"param-name"}>{name}</div>
        <DatePicker
          // onChange={onChange}
          picker="year" />
      </div>
    case "MONTH_AND_YEAR":
      return <div>
        <div className={"param-name"}>{name}</div>
        <DatePicker
          // onChange={onChange}
          picker="month" format={"MMMM YYYY"}/>
      </div>
    case "VALUE":
      return <InputValue name={name}
        // onChange
      />
    case "CAR":
      return <div>
        <div className={"param-name"}>{name}</div>
        <CarAutocomplete
          // onChange
        />
      </div>
    case "ZONE_LIST":
      return <div>
        <div className={"param-name"}>{name}</div>
        <ZoneSelect
          // onChange
        />
      </div>
    case "TIME_PERIOD":
      return <TimePeriod name={name}/>
    // case "SENSOR_VALUE":
    //   return <div>
    //     <div className={"param-name"}>{name}</div>
    //     <SensorSelect
    //               // onChange
    //               />
    //   </div>
    default:
      return <div className={"param-name"}>{type}</div>
  }

}

function InputValue({name}) {
  return <div>
       <div className={"param-name"}>{name}</div>
       <Input className={"param-name"}/>
     </div>
}

function OrgTree({onChangeReportParameter}) {
  const [value, setValue] = useState();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState();
  const {SHOW_PARENT} = TreeSelect;
  const {loading, error, data} = useQuery(GQL_ORG_TREE,
  // Убрала, т.к. работает только 1ый раз, потом берет из кеша и не выставляет value
  //   {onCompleted: () => {
  //   setValue({key: data?.orgTree[0]?.key, value: data?.orgTree[0]?.value});
  // }}
  );

  useEffect(() => {
    if (data) {
      setValue([data.orgTree[0]?.key]);
      onChangeReportParameter('orgs', value);
    }
  }, [data]);
  
  useEffect(() => {
    if (value && !open) {
      onChangeReportParameter('orgs', value);
    }
  }, [value, open]);

  useEffect(()=> {
    setStatus((!value || value.length === 0) ? "error" : "");
  }, [value]);

  return <div>{error
    ? <Alert message="Ошибка загрузки организаций" type="error" showIcon banner/>
    : <Spin spinning={loading}>
      <TreeSelect
        className={"param-value"}
        treeCheckable={true}
        showCheckedStrategy={SHOW_PARENT}
        treeLine={true}
        treeData={data?.orgTree || []}
        placeholder="Выберите подразделение"
        showSearch={true}
        treeDefaultExpandAll={true}
        value={value}
        status={status}
        // treeCheckStrictly={true}
        onChange={(orgId) => {
          // localStorage.setItem('orgId', orgId);
          setValue(orgId);
        }}

        onDropdownVisibleChange={(open) => {
          setOpen(open);
        }}
      />
    </Spin>
  }</div>
}

function GroupList() {
  const {loading, error, data} = useQuery(GQL_TS_GROUPS);

  return <Select className={"param-value"}
        value={data?.tsGroups[0]?.id}>
        {data && data.tsGroups.map((item, key) =>
          <Option value={item.id} key={item.id}>{item.name}</Option>
        )}
      </Select>

}

function CarAutocomplete() {

  const [value, setValue] = useState();
  const [delay, setDelay] = useState();
  const [loadData, { called, loading, data }] = useLazyQuery(GQL_CAR_LIST);

  return <div>
    <AutoComplete
      onSelect={(value, option)=> {
        setValue(option.children);
      }}
      onSearch={(value) => {
        clearTimeout(delay);
        setValue(value);
        setDelay(setTimeout(() => {
          loadData({variables: {value: value}});
          // Send Axios request here
        }, 300));
      }}
      placeholder="Начните вводить рег. номер или марку ТС"
      className={"param-value"}
      value={value}>
      {data && data.carList.map((car, index) => {
        return (
          <AutoComplete.Option key={car.idMO}>
            {car.nameMO}
          </AutoComplete.Option>
        );
      })}
      })}
    </AutoComplete>
  </div>
}

function SensorSelect() {
//TODO: вытащить откуда то idMO
  var idMO = 1;
  const {loading, error, data} = useQuery(GQL_SENSOR_LIST, {variables: {idMO: idMO}});

  return <Select className={"param-value"} value={data?.sensorList[0]?.idSensor +"_" + data?.sensorList[0]?.idSensorType}>
    {data && data.tsGroups.map((item, key) => {
        let value = item.idSensor + "_" + item.idSensorType;
        return <Option value={value} key={value}>{item.sensNum + " - " + item.description}</Option>
      }
    )}
  </Select>
}

function ZoneSelect() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [text, setText] = useState("Все");
  const [loadData, { called, loading, data }] = useLazyQuery(GQL_ZONE_LIST);
  const cols = [
    {
      title: 'Наименование',
      dataIndex: 'zoneName',
    },
    {
      title: 'Группа',
      dataIndex: 'zoneGroup',
    },
  ];
  const showModal = () => {
    setIsModalVisible(true);
    loadData();
    setSelectedRowKeys([]);
    setSelectedRows([]);
  };

  const handleOk = () => {
    setIsModalVisible(false);
    var text = "";
    for (var i=0; i<selectedRows.length; i++) {
      text = text + selectedRows[i].zoneName + ", ";
    }
    if (text.length > 2) text = text.substr(0, text.length - 2);
    setText(text);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setSelectedRowKeys([]);
    setSelectedRows([]);
  };

  const onSelectChange = (selectedRowKeys, selectedRows) => {
    setSelectedRowKeys(selectedRowKeys);
    setSelectedRows(selectedRows);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  return <div>
    <TextArea rows={3} readOnly={true} value={text}/>
    <Button type={"primary"} className={"button-zone"} onClick={showModal}>...</Button>
    <Modal title="Зоны контроля" visible={isModalVisible} onOk={handleOk} onCancel={handleCancel} afterClose={handleCancel}>
      <Spin spinning={loading}>
        <Table rowSelection={rowSelection} dataSource={data?.zoneList} columns={cols}/>
      </Spin>
    </Modal>
  </div>
}

function TimePeriod({name}) {
  const [showTime, setShowTime] = useState(false);

  const handleChange = () => {
    setShowTime(!showTime);
  }

  return <div>
    <Checkbox className={"param-value"} onChange={handleChange}>{name}</Checkbox>
    {showTime && <div>
      <TimePicker.RangePicker format={"HH:mm"}/>
    </div>}
  </div>

}

function ReportTable({report, paramMap, filled}) {
  // const {loading, error, data} = useQuery(GQL_REPORT, {variables: {params: paramMap}});
  const [loadData, { called, loading, data }] = useLazyQuery(GQL_REPORT);
  useEffect(() => {
    if (filled) {
      loadData({variables: {params: JSON.stringify(Array.from(paramMap.entries())), id: report.template.id}});
    }
  }, [filled]);

  var cols = [];
  var idx = 0;
  report && report.template.fields.map((item, key) => {
    let col;
    if (item.colCount === 1) {
      col = {title: item.descr, dataIndex: idx};
      cols.push(col);
      idx++;
    } else {
      //ТОDO: придумать для сложных заголовков
    }

  });

  return <Table columns={cols} dataSource={data?.report} pagination={{pageSize: 50, size: "small"}}
    scroll={{x: "100%"}} size={"small"}/>
}

function DateRange({name, onChangeReportParameter, format}) {
  const [dates, setDates] = useState(null);
  const [status, setStatus] = useState();
  const [open, setOpen] = useState(false);
  useEffect(()=> {
    if (dates && !open) {
      onChangeReportParameter(["date_start", "date_finish"], dates)
    }
    setStatus(dates && dates[0].length> 0 && dates[1].length > 0 ? "" : "error");
  }, [dates, open])

  return <div>
    <div className={"param-name"}>{name}</div>
    <RangePicker onChange={(dates, dateStrings) => {
      setDates(dateStrings);
    }} onOpenChange={(open) => {
      setOpen(open);
    }} format={format} status={status}/>
  </div>
}

function checkAllOptionsFilled(optionsList, paramMap) {
  for (var i = 0; i < optionsList.length; i++) {
    var option = optionsList[i];
    if (!option.isRequired) continue;
    switch (option.type) {
      case "ORGS":
        var orgs = paramMap.get("orgs");
        if (!orgs || orgs.length === 0) return false;
        continue;
      case "CAR_GROUP":
        var carGroup = paramMap.get("car_group");
        if (!carGroup || carGroup <= 0) return false;
        continue;
      case "DATE_START_AND_FINISH": case "DATETIME_START_AND_FINISH":
        var dateStart = paramMap.get("date_start");
        var dateFinish = paramMap.get("date_finish");
        if (!dateStart || !dateFinish || dateStart.length === 0 || dateFinish.length === 0) return false;
        continue;
      case "YEAR":
        //TODO
      case "MONTH_AND_YEAR":
        // TODO
      case "VALUE":
        //TODO
      case "CAR":
      //TODO
      case "ZONE_LIST":
      //TODO
      case "TIME_PERIOD":
      //TODO
    }
  }

  return true;
}

export default ReportPage;