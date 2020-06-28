import React from 'react';
import './App.css';
import axios from 'axios'
import bird from './assets/Bird.png'
import { faArrowLeft, faArrowRight, faMicrophone, faPause } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";


export default class Plabook extends React.Component{
    constructor(props){
        super(props)
        this.Recorder = null
        this.frequency = new Uint8Array(32*2)
        this.analizer = null
        this.state = {
            images: [],
            texts: [],
            names: [],
            currentImage: '',
            currentName: '',
            currentText: [],
            currentId: 0,
            percents: 0,
            microIcon: faMicrophone,
            isRecord: false,
            checkVoice: 0
        }
    }

    _getPermition(){
        navigator.mediaDevices.getUserMedia({ audio: true, video: false}).then(stream => {
            this.setState({
                isHavePermition: true
            })
            this.Recorder = new MediaRecorder(stream)
            const context = new AudioContext()
            this.analizer = context.createAnalyser()
            const src = context.createMediaStreamSource(stream)
            src.connect(this.analizer)
            this._loop()
        })
    }

    _loop = () =>{
        window.requestAnimationFrame(this._loop)
        this.analizer.getByteFrequencyData(this.frequency)
        this.setState({
            checkVoice: this.frequency[0]
        })
    }

    _setCheckVoice = (frequency) => {
        if(this.state.isRecord){
            if(frequency > 30){
                return{
                    borderColor: 'green',
                    color: 'green'
                }
            }else{
                return{
                    borderColor: 'black',
                    color: 'black'
                }
            }
        }else{
            return{
                borderColor: 'black',
                color: 'black'
            }
        }
    }

    componentDidMount(){
        this._getPermition()
        axios.get('http://95.163.215.127:3000/texts').then(r => {
            for(let i = 0; i< r.data.length; i++){
                this.state.images.push(r.data[i].image)
                this.state.names.push(r.data[i].name)
                this._getWordsArray(r.data[i].text)
            }
            this.setState({
                currentImage: this.state.images[0],
                currentName: this.state.names[0],
                currentText: this.state.texts[0]
            })
        })
    }

    _getWordsArray = (text) => {
        text = text.split(' ')
        let finalText = []
        let _id = 0
        for(let i=0; i<text.length; i++){
            let oneWord = {
                id: _id,
                word: text[i],
                style: 'default'
            }
            finalText.push(oneWord)
            _id++
            if(i !== text.length -1){
                let oneWord = {
                    id: _id,
                    word: ' ',
                    style: 'default'
                }
                finalText.push(oneWord)
                _id++
            }
        }
        this.state.texts.push(finalText)
    }

    _setBackground = (image) => {
        image = 'url(data:image/jpeg;base64,' + image + ')'
        return{
            backgroundImage: image,
        }
    }

    _clickArrowRight = () => {
        if(this.state.currentId < this.state.names.length - 1){
            let index = this.state.currentId
            let per = this.state.percents
            per = per + 25
            index++
            this.setState({
                currentName: this.state.names[index],
                currentText: this.state.texts[index],
                currentImage: this.state.images[index],
                currentId: index,
                percents: per
            })
        }
        
    }

    _clickArrowLeft = () => {
        if(this.state.currentId > 0){
            let index = this.state.currentId
            let per = this.state.percents
            per = per - 25
            index--
            this.setState({
                currentName: this.state.names[index],
                currentText: this.state.texts[index],
                currentImage: this.state.images[index],
                currentId: index,
                percents: per
            })
        }
        
    }

    _countPercents = (percent) =>{
        let perStr = String(percent)
        perStr = perStr + '%'
        return perStr
    }

    _countWidth = (percent) =>{
        let perStr = String(percent)
        perStr = perStr + '%'
        return{
            width: perStr
        }
    }

    _startRecord(){
        this.Recorder.start()
    }

    _stopRecord = async () => {
        this.Recorder.stop()
        const result = await this._getResult()
        let voice = []
        voice.push(result)
        const voiceBlob = new Blob(voice, {
            type: 'audio/wav'
        })
        const finalString = await this._getBinaryString(voiceBlob)
        console.log(this.state.currentName)
        axios.post('http://95.163.215.127:3000/saveRecord',{
            textName : this.state.currentName,
            record: finalString
        }).then(r => {
            const id = r.data.result._id
            axios.post('http://95.163.215.127:3000/checkRecord',{
                textName : this.state.currentName,
                recordId: id
            }).then(r => {
                let answers = r.data
                let counter = 0
                let tmp = this.state.currentText
                console.log(answers)
                for(let i = 0; i<tmp.length; i++){
                    if(tmp[i].word !== ' '){
                        if(answers[counter] === 0){
                            tmp[i].style = 'wrong'
                        }else{
                            tmp[i].style = 'right'
                        }
                        counter++
                    }
                }
                console.log(tmp)
            })
        })
    }

    _getBinaryString = (voiceBlob) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              resolve(reader.result)
            }
            reader.onerror = reject
            reader.readAsDataURL(voiceBlob)
          })
    }

    _getResult = () => {
        return new Promise((resolve) => {
            this.Recorder.ondataavailable = (e) => {
              resolve(e.data)
            }
          })
        }

    _clickRecordButton = () => {
        if(this.state.isRecord === false){
            this.setState({
                isRecord: true,
                microIcon: faPause
            })

            this._startRecord()
        }else{
            this.setState({
                isRecord: false,
                microIcon: faMicrophone
            })
            this._stopRecord()
        }
    }

    _setAnswerColor = (style) =>{
        if(style === 'wrong'){
            return{
                backgroundColor: 'rgba(255, 0, 0, 0.7)',
                lineHeight: 2,
                borderRadius: 6
            }
        }

        if(style === 'right'){
            return{
                backgroundColor: 'rgba(0, 128, 0, 0.7)',
                lineHeight: 2,
                borderRadius: 6
            }
        }

        if(style === 'default'){
            return{
                backgroundColor: 'transparent',
                fontSize: 36,
                lineHeight: 2,
                borderRadius: 6
            }
        }
    }

    _checkLeftArrow = (tmp) =>{
        if(tmp === this.state.names[0]){
            return{
                visibility: "hidden"
            }
        }
    }

    _checkRightArrow = (tmp) =>{
        if(tmp === (this.state.names[this.state.names.length - 1])){
            return{
                visibility: "hidden"
            }
        }
    }

    render(){
        return(
            <div className = "wrapper" style={this._setBackground(this.state.currentImage)}>
                <div className="sidesWrapper">
                    <div className = "leftSide">
                        <p className="textBlock">{
                            this.state.currentText.map((item) => (
                            <span key={item.id} style = {this._setAnswerColor(item.style)}>{item.word}</span>
                            ))
                        }</p>
                    </div>
                    <div className = "rightSide">
                        <img src= {bird}></img>
                    </div>
                </div>
                <div className="controlBlock">
                    <div className="pageControll">
                        <div className="progressBar">
                            <div className="progressInner" style = {this._countWidth(this.state.percents)}>
                            </div>
                            <div className="percents">
                                <p>{this._countPercents(this.state.percents)}</p>
                            </div>
                        </div>
                        <div className="arrowsBlock">
                            <a className="controlBtn" href="#" onClick = {this._clickArrowLeft} style = {this._checkLeftArrow(this.state.currentName)}><FontAwesomeIcon icon={faArrowLeft} /></a>
                            <a className="controlBtn" href="#" onClick = {this._clickRecordButton} style= { this._setCheckVoice(this.state.checkVoice) }><FontAwesomeIcon icon={this.state.microIcon} /></a>
                            <a className="controlBtn" href="#" onClick = {this._clickArrowRight} style = {this._checkRightArrow(this.state.currentName)}><FontAwesomeIcon icon={faArrowRight} /></a>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}
